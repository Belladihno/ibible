import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
  GenerateContentResult,
} from '@google/generative-ai';

@Injectable()
export class PrayerGeminiService {
  private readonly logger = new Logger(PrayerGeminiService.name);
  private readonly model: GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for PrayerGeminiService');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the same model but we control generation config per-call
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generateContent(prompt: string, context?: string): Promise<string> {
    const fullPrompt = this.buildPrompt(prompt, context);

    const generationConfig: GenerationConfig = {
      temperature: 0.7,
      maxOutputTokens: 1200,
      topP: 0.9,
      topK: 40,
    };

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result: GenerateContentResult = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig,
        });

        const text = result?.response?.text?.();
        this.logger.debug(
          `PrayerGemini fullPrompt length=${fullPrompt.length}`,
        );
        this.logger.debug(`PrayerGemini response length=${text?.length ?? 0}`);

        if (text && text.trim()) return text;

        this.logger.warn(
          `PrayerGemini empty response (attempt ${attempt}/${maxAttempts})`,
        );
      } catch (err: any) {
        this.logger.warn(
          `PrayerGemini attempt ${attempt} error: ${err?.message ?? err}`,
        );
        if (attempt === maxAttempts) throw err;
      }

      // backoff
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }

    throw new Error('Empty response from PrayerGeminiService after retries');
  }

  private buildPrompt(message: string, context?: string): string {
    // Keep the prompt concise for prayer generation to avoid very long prompts
    const ctx = context ? `Context: ${context}` : '';
    return `You are Rea, a Bible-centered prayer assistant. ${ctx}\nUser: ${message}`;
  }
}
