import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
  GenerateContentResult,
} from '@google/generative-ai';

@Injectable()
export class ReflectionGeminiService {
  private readonly logger = new Logger(ReflectionGeminiService.name);
  private readonly model: GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('REFLECTION_GEMINI_API_KEY');
    if (!apiKey) throw new Error('REFLECTION_GEMINI_API_KEY missing');

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generateReflection({
    verseReference,
    verseText,
    userReflection,
  }: {
    verseReference: string;
    verseText: string;
    userReflection: string;
  }): Promise<string> {
    const prompt = `
You are Rea, a gentle reflection guide. The user is reflecting on scripture.
Verse: ${verseReference}
Text: ${verseText}

User reflection: ${userReflection}

Respond with a warm, thoughtful, single-paragraph spiritual reflection.
    `.trim();

    return this.safeGenerate(prompt);
  }

  async generateContinuedReflection({
    verseReference,
    verseText,
    history,
    newUserMessage,
  }: {
    verseReference: string;
    verseText: string;
    history: { role: string; message: string }[];
    newUserMessage: string;
  }): Promise<string> {
    const chatContext = history
      .map((h) => `${h.role === 'user' ? 'User' : 'Rea'}: ${h.message}`)
      .join('\n');

    const prompt = `
You are Rea, a warm and scripturally-grounded reflection companion.

Verse: ${verseReference}
Text: ${verseText}

Conversation so far:
${chatContext}

New user message:
${newUserMessage}

Respond with empathy, clarity, and gentle spiritual insight.
    `.trim();

    return this.safeGenerate(prompt);
  }

  private async safeGenerate(prompt: string): Promise<string> {
    const config: GenerationConfig = {
      temperature: 0.7,
      maxOutputTokens: 800,
    };

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: config,
        });

        const text = result?.response?.text?.();
        if (text?.trim()) return text;
      } catch (err) {
        this.logger.warn(`Reflection attempt ${attempt} failed: ${err}`);
        if (attempt === maxAttempts) throw err;
      }
      await new Promise((res) => setTimeout(res, attempt * 300));
    }
    throw new Error('Empty response from Reflection AI');
  }
}
