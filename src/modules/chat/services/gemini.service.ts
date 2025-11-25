import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generateContent(
    prompt: string,
    context?: string,
    history?: { role: string; parts: { text: string }[] }[],
  ): Promise<string> {
    try {
      const fullPrompt = this.buildPrompt(prompt, context);

      const generationConfig: GenerationConfig = {
        temperature: 0.7,
        maxOutputTokens: 1000,
        topP: 0.9,
        topK: 40,
      };

      // With chat history
      if (history?.length) {
        const chat = this.model.startChat({
          history,
          generationConfig,
        });

        const result = await chat.sendMessage(fullPrompt);
        return result.response.text();
      }

      // Single message
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      return result.response.text();
    } catch (error) {
      this.logger.error(`Gemini error: ${error.message}`);
      throw error;
    }
  }

  private buildPrompt(message: string, context?: string): string {
    return `
You are Rea, a helpful Bible-focused AI assistant.
Provide kind, respectful, and theologically-sound responses.
Always quote scripture where relevant.

${context ? `Context: ${context}` : ''}
User: ${message}
`;
  }

  async generateBibleSpecificContent(
    message: string,
    scriptureRefs: string[] = [],
  ): Promise<string> {
    const context = scriptureRefs.length
      ? `Focus on these verses: ${scriptureRefs.join(', ')}`
      : '';

    return this.generateContent(message, context);
  }
}
