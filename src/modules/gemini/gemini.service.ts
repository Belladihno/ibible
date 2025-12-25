import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatRole, ReaFeature } from 'src/shared/enums';
import { ChatMessage } from 'src/shared/types/chat.types';
import Redis from 'ioredis';

interface OpenRouterResponse {
  choices: { message: { content: string } }[];
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    const key = this.configService.get<string>('OPENROUTER_API_KEY');
    if (!key) throw new Error('OPENROUTER_API_KEY is required');
    this.apiKey = key;
  }

  private static FEATURE_MODEL_MAP: Record<ReaFeature, string> = {
    [ReaFeature.DISCOVER]: 'google/gemini-2.5-flash',
    [ReaFeature.PRAYER]: 'google/gemini-2.5-flash',
    [ReaFeature.CHAT]: 'google/gemini-2.5-pro',
    [ReaFeature.REFLECTION]: 'google/gemini-2.5-flash',
    [ReaFeature.TITLE]: 'google/gemini-2.5-flash',
    [ReaFeature.MEMORIES]: 'google/gemini-2.5-pro',
    [ReaFeature.BIBLE]: 'google/gemini-2.5-pro',
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
  ): Promise<string> {
    // GLOBAL AI RATE LIMIT
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

      return data.choices[0].message.content;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM error [${feature} → ${model}]: ${msg}`);
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
