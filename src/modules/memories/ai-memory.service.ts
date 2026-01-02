import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '../queue/queue-names.enum';
import { ChatMessage } from 'src/shared/types/chat.types';
import { ChatRole, ReaFeature } from 'src/shared/enums';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class AiMemoryService {
  private readonly logger = new Logger(AiMemoryService.name);

  constructor(
    private readonly gemini: GeminiService,
    @InjectQueue(QueueName.MEMORIES_PROCESSING)
    private readonly aiQueue: Queue, // made required
  ) {}

  async rephraseMemory(
    memoryTitle: string,
    memoryBody: string,
    userId?: string,
  ): Promise<string> {
    try {
      const prompt = this.buildRephrasePrompt(memoryTitle, memoryBody);
      const messages: ChatMessage[] = [
        { role: ChatRole.USER, content: prompt },
      ];

      const result = await this.gemini.generate(ReaFeature.MEMORIES, prompt, {
        history: messages,
        userId,
      });

      if (!result.content?.trim()) {
        this.logger.error('Empty rephrase result from Gemini for memory');
        throw new HttpException(
          'Empty rephrase result from AI',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return this.cleanResult(result.content);
    } catch (error: unknown) {
      this.logger.error('Failed to rephrase memory', error);
      throw new HttpException(
        'Failed to rephrase memory',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private buildRephrasePrompt(title: string, body: string): string {
    const titlePart = title.trim() ? `Title: ${title.trim()}\n` : '';
    return `Rephrase the following journal memory into a concise, reflective paragraph suitable for a personal memory journal. Keep the meaning and emotion, make it clear and natural. Return ONLY the rephrased text.\n\n${titlePart}Memory:\n"${body}"\n\nReturn only the rephrased memory text:`;
  }

  private cleanResult(result: string): string {
    let cleaned = result.trim();
    cleaned = cleaned.replace(
      /^Here is a rephrased (version|memory)[:\s-]*/i,
      '',
    );
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    return cleaned;
  }
}
