import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatRole, ReaFeature } from 'src/shared/enums';
import { ChatMessage } from 'src/shared/types/chat.types';

interface OpenRouterResponse {
  choices: { message: { content: string } }[];
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(private readonly configService: ConfigService) {
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
    },
  ): Promise<string> {
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
