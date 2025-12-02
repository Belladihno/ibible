// modules/memories/ai-memory.service.ts
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Inject,
} from '@nestjs/common';
import { GeminiService } from '../chat/services/gemini.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '../queue/queue-names.enum';

@Injectable()
export class AiMemoryService {
  private readonly logger = new Logger(AiMemoryService.name);

  constructor(
    private readonly gemini: GeminiService,
    @InjectQueue(QueueName.MEMORIES_PROCESSING)
    private readonly aiQueue?: Queue,
  ) {}

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

      if (!result?.trim()) {
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
        (cleaned.startsWith("'") && cleaned.endsWith("'"))
      ) {
        cleaned = cleaned.slice(1, -1).trim();
      }

      return cleaned;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to rephrase memory', errorMessage);
      throw new HttpException(
        'Failed to rephrase memory',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async rephrase(memoryTitle: string, memoryBody: string): Promise<string> {
    return this.rephraseMemory(memoryTitle, memoryBody);
  }

  async queueRephrase(
    memoryId: string,
    title: string,
    body: string,
    userId: string,
  ): Promise<string> {
    if (!this.aiQueue) {
      this.logger.warn('Queue not available, skipping AI rephrase queuing');
      return 'queue-unavailable';
    }

    try {
      const job = await this.aiQueue.add(
        'rephrase',
        {
          type: 'rephrase',
          data: { memoryId, title, body, userId },
        },
        {
          jobId: `memory-ai-${memoryId}-${Date.now()}`,
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: true,
        },
      );
      return job.id || 'job-queued';
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to queue rephrase job for memory ${memoryId}:`,
        errorMessage,
      );
      throw new HttpException(
        'Failed to queue AI processing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async queueGenerateInsights(
    memoryId: string,
    title: string,
    body: string,
    userId: string,
  ): Promise<string> {
    if (!this.aiQueue) {
      this.logger.warn('Queue not available, skipping AI insights queuing');
      return 'queue-unavailable';
    }

    try {
      const job = await this.aiQueue.add(
        'generate-insights',
        {
          type: 'generate-insights',
          data: { memoryId, title, body, userId },
        },
        {
          jobId: `memory-insights-${memoryId}-${Date.now()}`,
          attempts: 2,
          removeOnComplete: true,
        },
      );
      return job.id || 'job-queued';
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to queue insights job for memory ${memoryId}:`,
        errorMessage,
      );
      throw new HttpException(
        'Failed to queue AI insights',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private buildRephrasePrompt(title: string, body: string): string {
    const titlePart = title.trim() ? `Title: ${title.trim()}\n` : '';
    return `Rephrase the following journal memory into a concise, reflective paragraph suitable for a personal memory journal. Keep the meaning and emotion, make it clear and natural. Return ONLY the rephrased text without explanations or labels.\n\n${titlePart}Memory:\n"${body}"\n\nReturn only the rephrased memory text:`;
  }
}
