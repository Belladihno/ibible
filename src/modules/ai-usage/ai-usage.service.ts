import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiUsageLog } from 'src/entities/ai-usage-log.entity';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  // Updated pricing per million tokens for your models
  private readonly PRICING = {
    'google/gemini-2.5-flash': {
      input: 0.1, // $0.10 per 1M tokens
      output: 0.4, // $0.40 per 1M tokens
    },
    'google/gemini-2.5-pro': {
      input: 1.25, // $1.25 per 1M tokens
      output: 5.0, // $5.00 per 1M tokens
    },
    // Adding 1.5 versions as well since common in codebase
    'google/gemini-1.5-flash': {
      input: 0.1,
      output: 0.4,
    },
    'google/gemini-1.5-pro': {
      input: 1.25,
      output: 5.0,
    },
  };

  constructor(
    @InjectRepository(AiUsageLog)
    private readonly aiUsageRepo: Repository<AiUsageLog>,
  ) {}

  async logUsage(data: {
    userId: string | null;
    feature: string;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    metadata?: any;
  }) {
    try {
      const totalTokens = data.inputTokens + data.outputTokens;

      // Get pricing for the specific model
      const pricing = this.PRICING[data.model as keyof typeof this.PRICING];
      let cost = 0;

      if (pricing) {
        // Calculate cost based on input and output tokens
        const inputCost = (data.inputTokens / 1_000_000) * pricing.input;
        const outputCost = (data.outputTokens / 1_000_000) * pricing.output;
        cost = inputCost + outputCost;
      } else {
        // Fallback to generic pricing if model not in our map
        this.logger.warn(`Unknown model ${data.model}, using generic pricing`);
        const costPerMillion = 2.0; // Conservative $2.00 per 1M tokens
        cost = (totalTokens / 1_000_000) * costPerMillion;
      }

      const log = this.aiUsageRepo.create({
        ...data,
        totalTokens,
        cost,
      });

      await this.aiUsageRepo.save(log);

      // Optional: Log cost for monitoring
      if (cost > 0.01) {
        // Only log significant costs
        this.logger.log(`AI usage cost for ${data.model}: $${cost.toFixed(6)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to log AI usage: ${error.message}`);
    }
  }

  // Optional: Add a method to calculate estimated cost before making a call
  estimateCost(
    model: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
  ): number {
    const pricing = this.PRICING[model as keyof typeof this.PRICING];

    if (!pricing) {
      this.logger.warn(`Cannot estimate cost for unknown model: ${model}`);
      return 0;
    }

    const inputCost = (estimatedInputTokens / 1_000_000) * pricing.input;
    const outputCost = (estimatedOutputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  async getCostAnalytics(timeframe: 'day' | 'week' | 'month'): Promise<any> {
    const date = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return this.aiUsageRepo
      .createQueryBuilder('log')
      .select('log.model')
      .addSelect('SUM(log.cost)', 'totalCost')
      .addSelect('SUM(log.inputTokens)', 'totalInputTokens')
      .addSelect('SUM(log.outputTokens)', 'totalOutputTokens')
      .addSelect('COUNT(log.id)', 'requestCount')
      .where('log.createdAt >= :startDate', { startDate })
      .groupBy('log.model')
      .getRawMany();
  }
}
