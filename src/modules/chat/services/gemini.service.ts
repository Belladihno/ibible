import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
  GenerateContentResult,
} from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly model: GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // Changed to 1.5-flash
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

      if (history?.length) {
        const chat = this.model.startChat({
          history,
          generationConfig,
        });

        const result: GenerateContentResult =
          await chat.sendMessage(fullPrompt);
        return result.response.text();
      }

      const result: GenerateContentResult = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      return result.response.text();
    } catch (error: any) {
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

  /**
   * Simple title generation that always works
   */
  async generateTitle(userMessage: string): Promise<string> {
    this.logger.log(
      `Generating title for: ${userMessage.substring(0, 100)}...`,
    );

    try {
      // Simple direct prompt - no complex rules
      const prompt = `Make a 4-9 word title for: "${userMessage.substring(0, 300)}"`;

      const generationConfig: GenerationConfig = {
        temperature: 0.5,
        maxOutputTokens: 30,
        topP: 0.8,
        topK: 1,
      };

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      let title = result.response.text().trim();

      // If Gemini returns empty, use fallback
      if (!title || title.length < 2) {
        return this.createFallbackTitle(userMessage);
      }

      // Clean up
      title = title
        .replace(/["']/g, '')
        .replace(/\.+$/g, '')
        .trim()
        .substring(0, 60);

      return title;
    } catch (error) {
      this.logger.warn(`Title generation failed: ${error.message}`);
      return this.createFallbackTitle(userMessage);
    }
  }

  /**
   * Fallback title when Gemini fails
   */
  private createFallbackTitle(userMessage: string): string {
    const lowerMsg = userMessage.toLowerCase();

    // Common topics mapping
    if (lowerMsg.includes('spouse') || lowerMsg.includes('marriage'))
      return 'Marriage Guidance';
    if (lowerMsg.includes('anxious') || lowerMsg.includes('anxiety'))
      return 'Anxiety Support';
    if (lowerMsg.includes('job') || lowerMsg.includes('work'))
      return 'Career Guidance';
    if (lowerMsg.includes('pray')) return 'Prayer Discussion';
    if (lowerMsg.includes('forgiv')) return 'Forgiveness';
    if (lowerMsg.includes('money')) return 'Finances';
    if (lowerMsg.includes('health')) return 'Health';
    if (lowerMsg.includes('family')) return 'Family';
    if (lowerMsg.includes('friend')) return 'Friendship';

    // Look for Bible verses
    const verseMatch = userMessage.match(/([1-3]?\s?[A-Z][a-z]+ \d+:\d+)/);
    if (verseMatch) return `Study: ${verseMatch[1]}`;

    // First few words as title
    const words = userMessage.split(' ').slice(0, 4).join(' ');
    return words || 'Chat';
  }
}
