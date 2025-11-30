import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../chat/services/gemini.service';

@Injectable()
export class AiMemoryService {
  private readonly logger = new Logger(AiMemoryService.name);
  constructor(private gemini: GeminiService) {}

  async rephraseMemory(
    memoryTitle: string,
    memoryBody: string,
  ): Promise<string> {
    try {
      const prompt = this.buildRephrasePrompt(memoryTitle, memoryBody);
      const result = await this.gemini.generateContent(prompt);
      this.logger.debug(`AiMemory rephrase prompt length=${prompt.length}`);
      this.logger.debug(
        `AiMemory rephrase result length=${result?.length ?? 0}`,
      );

      if (!result || !result.trim()) {
        this.logger.error('Empty rephrase result from Gemini for memory');
        throw new HttpException(
          'Empty rephrase result from AI',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      let cleaned = result.trim();
      // Remove common labels and surrounding quotes
      cleaned = cleaned.replace(
        /^Here is a rephrased version[\s\S]*?:\s*/i,
        '',
      );
      cleaned = cleaned.replace(/^Here is a rephrased memory[:\s-]*/i, '');
      cleaned = cleaned.replace(/^Here is a rephrased[:\s-]*/i, '');
      cleaned = cleaned.replace(/^Rephrased version[:\s-]*/i, '');
      cleaned = cleaned.replace(/^Rephrased memory[:\s-]*/i, '');
      cleaned = cleaned.replace(/^Rephrased[:\s-]*/i, '');
      if (
        (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith('“') && cleaned.endsWith('”'))
      ) {
        cleaned = cleaned.slice(1, -1).trim();
      }

      return cleaned;
    } catch (err: any) {
      this.logger.error('Failed to rephrase memory', err?.message ?? err);
      throw new HttpException(
        'Failed to rephrase memory',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private buildRephrasePrompt(title: string, body: string): string {
    const titlePart = title && title.trim() ? `Title: ${title.trim()}\n` : '';
    return `Rephrase the following journal memory into a concise, reflective paragraph suitable for a personal memory journal. Keep the meaning and emotion, make it clear and natural. Return ONLY the rephrased text without explanations or labels.\n\n${titlePart}Memory:\n"${body}"\n\nReturn only the rephrased memory text:`;
  }
}
