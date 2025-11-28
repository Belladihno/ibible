import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrayerGeminiService } from './services/prayer-gemini.service';
import { PrayerType } from 'src/entities/prayer.entity';

@Injectable()
export class AiPrayerService {
  private readonly logger = new Logger(AiPrayerService.name);
  constructor(private prayerGeminiService: PrayerGeminiService) {}

  async rephrasePrayerRequest(
    prayerRequest: string,
    type: PrayerType,
  ): Promise<string> {
    try {
      const prompt = this.buildRephrasePrompt(prayerRequest, type);
      const result = await this.prayerGeminiService.generateContent(prompt);
      this.logger.debug(`Rephrase prompt length=${prompt.length}`);
      this.logger.debug(`Rephrase result length=${result?.length ?? 0}`);

      if (!result || !result.trim()) {
        this.logger.error('Empty rephrase result from Gemini');
        throw new HttpException(
          'Empty rephrase result from AI',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Defensive cleanup: remove common preambles/labels and surrounding quotes
      let cleaned = result.trim();
      // Remove common leading phrases like 'Here is a rephrased version...'
      cleaned = cleaned.replace(
        /^Here is a rephrased version[\s\S]*?:\s*/i,
        '',
      );
      cleaned = cleaned.replace(/^Rephrased version[\s\S]*?:\s*/i, '');
      cleaned = cleaned.replace(/^Rephrased prayer[\s\S]*?:\s*/i, '');
      cleaned = cleaned.replace(/^Rephrased:\s*/i, '');
      // Remove surrounding quotes if present
      if (
        (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith('“') && cleaned.endsWith('”'))
      ) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      // Final trim and return
      return cleaned.trim();
    } catch (error) {
      this.logger.error(
        'Failed to rephrase prayer request',
        error?.message ?? error,
      );
      throw new HttpException(
        'Failed to rephrase prayer request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generatePrayer(
    rephrasedRequest: string,
    type: PrayerType,
  ): Promise<string> {
    try {
      const prompt = this.buildPrayerGenerationPrompt(rephrasedRequest, type);
      const result = await this.prayerGeminiService.generateContent(prompt);
      this.logger.debug(`Generate prompt length=${prompt.length}`);
      this.logger.debug(`Generated prayer length=${result?.length ?? 0}`);

      if (!result || !result.trim()) {
        this.logger.error('Empty generated prayer from Gemini');
        throw new HttpException(
          'Empty generated prayer from AI',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to generate prayer', error?.message ?? error);
      throw new HttpException(
        'Failed to generate prayer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private buildRephrasePrompt(prayerRequest: string, type: PrayerType): string {
    const prayerTypeText =
      type === PrayerType.SELF ? 'personal prayer' : 'prayer for others';

    return `Rephrase the following ${prayerTypeText} request into a concise, clear paragraph suitable for use in a prayer app. Preserve the original meaning, emotion, and a Bible-centered perspective. Return ONLY the rephrased prayer text — do NOT include any preamble, labels (like "Rephrased version"), explanations, or surrounding quotation marks.

            Prayer request:
            "${prayerRequest}"

            Return only the rephrased prayer text:`;
  }

  private buildPrayerGenerationPrompt(
    rephrasedRequest: string,
    type: PrayerType,
  ): string {
    const prayerTypeText =
      type === PrayerType.SELF ? 'personal' : 'intercessory';

    return `Create a powerful Christian prayer based on this ${prayerTypeText} request: "${rephrasedRequest}"

    Guidelines:
    - Make it biblically grounded and theologically sound
    - Keep it personal, heartfelt, and encouraging
    - Use respectful, beautiful prayer language
    - Include relevant scripture principles
    - Focus on God's character and promises
    - End with faith and expectation

    Provide only the prayer text without explanations.`;
  }
}
