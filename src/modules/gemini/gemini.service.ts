import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatRole, ReaFeature } from 'src/shared/enums';
import { ChatMessage } from 'src/shared/types/chat.types';
import Redis from 'ioredis';
import { AiUsageService } from '../ai-usage/ai-usage.service';

/**
 * Response structure from OpenRouter API
 */
interface OpenRouterResponse {
  choices: {
    message: { content: string };
    finish_reason: 'stop' | 'length' | 'content_filter' | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Result returned by generate method
 * - content: The AI response text
 * - finishReason: Why the model stopped generating
 * - isComplete: Quick check if response finished naturally
 */
export interface GenerateResult {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | null;
  isComplete: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly creditsUrl = 'https://openrouter.ai/api/v1/credits';

  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly aiUsageService: AiUsageService,
  ) {
    const key = this.configService.get<string>('OPENROUTER_API_KEY');
    if (!key) throw new Error('OPENROUTER_API_KEY is required');
    this.apiKey = key;
  }

  private static FEATURE_MODEL_MAP: Record<ReaFeature, string> = {
    [ReaFeature.DISCOVER]: 'google/gemini-2.5-flash',
    [ReaFeature.PRAYER]: 'google/gemini-2.5-flash',
    [ReaFeature.CHAT]: 'google/gemini-2.5-flash',
    [ReaFeature.REFLECTION]: 'google/gemini-2.5-flash',
    [ReaFeature.TITLE]: 'google/gemini-2.5-flash',
    [ReaFeature.MEMORIES]: 'google/gemini-2.5-pro',
    [ReaFeature.BIBLE]: 'google/gemini-2.5-flash',
  };

  private readonly MODEL_PRICING = {
    'google/gemini-2.5-flash': { input: 0.1, output: 0.4 },
    'google/gemini-2.5-pro': { input: 1.25, output: 5.0 },
    'google/gemini-1.5-flash': { input: 0.1, output: 0.4 },
    'google/gemini-1.5-pro': { input: 1.25, output: 5.0 },
  };

  async generate(
    feature: ReaFeature,
    prompt: string,
    options?: {
      systemPrompt?: string;
      history?: ChatMessage[];
      temperature?: number;
      maxTokens?: number;
      userId?: string;
    },
  ): Promise<GenerateResult> {
    // GLOBAL AI RATE LIMIT (TITLE generation is free, BIBLE caching for daily verses is free)
    if (
      feature !== ReaFeature.TITLE &&
      !(feature === ReaFeature.BIBLE && !options?.userId)
    ) {
      if (options?.userId) {
        // Authenticated user limits
        // Daily limit check
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const dailyKey = `ai_daily_limit:${options.userId}:${today}`;
        const dailyUsage = await this.redis.incr(dailyKey);
        if (dailyUsage === 1) {
          // Expire at end of day
          const now = new Date();
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          const ttl = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
          await this.redis.expire(dailyKey, ttl);
        }
        if (dailyUsage > 15) {
          throw new Error(
            'Daily AI request limit exceeded (15 requests per day). Please try again tomorrow.',
          );
        }

        // Per-minute limit check
        const rateLimitKey = `ai_limit:${options.userId}`;
        const currentUsage = await this.redis.incr(rateLimitKey);
        if (currentUsage === 1) await this.redis.expire(rateLimitKey, 60);
        if (currentUsage > 3) {
          throw new Error(
            'AI request rate limit exceeded (3 requests per minute). Please try again later.',
          );
        }
      } else {
        // Public/unauthenticated limits - shared across all public requests
        // Daily limit check
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const dailyKey = `ai_public_daily_limit:${today}`;
        const dailyUsage = await this.redis.incr(dailyKey);
        if (dailyUsage === 1) {
          // Expire at end of day
          const now = new Date();
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          const ttl = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
          await this.redis.expire(dailyKey, ttl);
        }
        if (dailyUsage > 5) {
          throw new Error(
            'Daily public AI request limit exceeded (5 requests per day). Please try again tomorrow.',
          );
        }

        // Per-minute limit check
        const rateLimitKey = `ai_public_limit`;
        const currentUsage = await this.redis.incr(rateLimitKey);
        if (currentUsage === 1) await this.redis.expire(rateLimitKey, 60);
        if (currentUsage > 1) {
          throw new Error(
            'Public AI request rate limit exceeded (1 request per minute). Please try again later.',
          );
        }
      }
    }

    const model = GeminiService.FEATURE_MODEL_MAP[feature];

    const messages: ChatMessage[] = [
      ...(options?.systemPrompt
        ? [{ role: ChatRole.SYSTEM, content: options.systemPrompt }]
        : []),
      ...(options?.history ?? []),
      { role: ChatRole.USER, content: prompt },
    ];

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'REA Backend',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter ${response.status}: ${text}`);
      }

      const data: OpenRouterResponse =
        (await response.json()) as OpenRouterResponse;

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('OpenRouter returned no content');
      }

      // Log AI usage
      if (data.usage) {
        await this.aiUsageService.logUsage({
          userId: options?.userId || null,
          feature,
          model,
          provider: 'openrouter',
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          metadata: {
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
            systemPrompt: options?.systemPrompt,
          },
        });
      }

      const choice = data.choices[0];
      return {
        content: choice.message.content,
        finishReason: choice.finish_reason,
        isComplete: choice.finish_reason === 'stop',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM error [${feature} → ${model}]: ${msg}`);
      throw new Error(msg);
    }
  }

  async generateWithCostControl(
    feature: ReaFeature,
    prompt: string,
    options?: {
      systemPrompt?: string;
      history?: ChatMessage[];
      temperature?: number;
      maxTokens?: number;
      userId?: string;
      maxCost?: number; // Maximum allowed cost for this request
    },
  ): Promise<{
    content: string;
    cost: number;
    tokens: { input: number; output: number };
  }> {
    const model = GeminiService.FEATURE_MODEL_MAP[feature];
    const pricing =
      this.MODEL_PRICING[model as keyof typeof this.MODEL_PRICING];

    // Estimate cost based on approximate token counts
    if (options?.maxCost && pricing) {
      // Simple estimation: ~4 characters per token for English
      let estimatedInputTokens = Math.ceil(prompt.length / 4);
      // Add tokens from history if present
      if (options?.history) {
        estimatedInputTokens += options.history.reduce(
          (acc, msg) => acc + Math.ceil(msg.content.length / 4),
          0,
        );
      }

      const estimatedCost = (estimatedInputTokens / 1_000_000) * pricing.input;

      if (estimatedCost > options.maxCost) {
        throw new Error(
          `Estimated cost ($${estimatedCost.toFixed(6)}) exceeds maximum allowed ($${options.maxCost})`,
        );
      }
    }

    const messages: ChatMessage[] = [
      ...(options?.systemPrompt
        ? [{ role: ChatRole.SYSTEM, content: options.systemPrompt }]
        : []),
      ...(options?.history ?? []),
      { role: ChatRole.USER, content: prompt },
    ];

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'REA Backend',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter ${response.status}: ${text}`);
      }

      const data: OpenRouterResponse =
        (await response.json()) as OpenRouterResponse;

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('OpenRouter returned no content');
      }

      let cost = 0;
      if (data.usage && pricing) {
        // Calculate actual cost
        const inputCost =
          (data.usage.prompt_tokens / 1_000_000) * pricing.input;
        const outputCost =
          (data.usage.completion_tokens / 1_000_000) * pricing.output;
        cost = inputCost + outputCost;

        // Log AI usage with actual cost
        await this.aiUsageService.logUsage({
          userId: options?.userId || null,
          feature,
          model,
          provider: 'openrouter',
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          metadata: {
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
            systemPrompt: options?.systemPrompt,
            calculatedCost: cost,
          },
        });
      }

      return {
        content: data.choices[0].message.content,
        cost,
        tokens: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM error [${feature} → ${model}]: ${msg}`);
      throw new Error(msg);
    }
  }

  async getCredits(): Promise<{ total_credits: number; total_usage: number }> {
    try {
      const response = await fetch(this.creditsUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter Credits ${response.status}: ${text}`);
      }

      const { data } = (await response.json()) as {
        data: { total_credits: number; total_usage: number };
      };

      return data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenRouter Credits Error: ${msg}`);
      throw new Error(msg);
    }
  }

  parseJsonArray<T>(input: string): T[] {
    try {
      const parsed: unknown = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed as T[];
      return [];
    } catch {
      return [];
    }
  }
}
