// modules/queue/processors/memories-ai.processor.ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '../queue-names.enum';

interface RephraseJobData {
  memoryId: string;
  title: string;
  body: string;
  userId: string;
}

interface InsightsJobData {
  memoryId: string;
  title: string;
  body: string;
  userId: string;
}

interface RephraseResult {
  success: boolean;
  memoryId: string;
  rephrased: string;
  processedAt: string;
  model: string;
}

interface InsightsResult {
  success: boolean;
  memoryId: string;
  insights: {
    themes: string[];
    emotionalTone: 'positive' | 'neutral' | 'negative';
    suggestedVerses: string[];
    suggestedTags: string[];
    summary: string;
    keyTakeaway: string;
  };
  processedAt: string;
  model: string;
}

type JobType = 'rephrase' | 'generate-insights';

interface InsightsJSON {
  themes: string[];
  emotionalTone: string;
  suggestedVerses: string[];
  suggestedTags: string[];
  summary: string;
  keyTakeaway: string;
}

@Processor(QueueName.MEMORIES_PROCESSING)
export class MemoriesAiProcessor extends WorkerHost {
  private readonly logger = new Logger(MemoriesAiProcessor.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>('GEMINI_MEMORIES_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.logger.log('Memories AI processor initialized');
    } else {
      this.logger.warn('GEMINI_MEMORIES_API_KEY not found, AI disabled');
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Processing memory AI job ${job.id}: ${job.name}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Memory AI job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Memory AI job ${job.id} failed: ${error.message}`);
  }

  async process(job: Job): Promise<RephraseResult | InsightsResult> {
    const jobData = job.data as {
      type: JobType;
      data: RephraseJobData | InsightsJobData;
    };

    const { type, data } = jobData;

    switch (type) {
      case 'rephrase':
        return await this.handleRephrase(data as RephraseJobData);
      case 'generate-insights':
        return await this.handleGenerateInsights(data as InsightsJobData);
      default:
        throw new Error(`Unknown job type: ${type as string}`);
    }
  }

  private async handleRephrase(data: RephraseJobData): Promise<RephraseResult> {
    const { memoryId, title, body } = data;

    if (!this.genAI) {
      throw new Error('Gemini AI not configured for memories');
    }

    try {
      // Use proper Promise-based delay
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limiting

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      // Get safe title WITHOUT template literals
      const safeTitle = this.convertToString(title);

      // Build prompt using only string concatenation
      const prompt =
        'Rephrase this spiritual memory into a concise, reflective paragraph.' +
        '\n\n' +
        'Title: ' +
        safeTitle +
        '\n' +
        'Content: "' +
        body +
        '"' +
        '\n\n' +
        'Return ONLY the rephrased text without any labels, explanations, or additional text.' +
        '\n' +
        'Make it 1-3 sentences maximum, keep the original meaning and emotion.';

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const cleaned = this.cleanAIResponse(text);

      return {
        success: true,
        memoryId,
        rephrased: cleaned,
        processedAt: new Date().toISOString(),
        model: 'gemini-1.5-flash',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `AI rephrase failed for memory ${memoryId}:`,
        errorMessage,
      );

      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        // Wait 5 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
        throw new Error(`Rate limited: ${errorMessage}`);
      }

      throw new Error(`AI rephrase failed: ${errorMessage}`);
    }
  }

  private async handleGenerateInsights(
    data: InsightsJobData,
  ): Promise<InsightsResult> {
    const { memoryId, title, body } = data;

    if (!this.genAI) {
      throw new Error('Gemini AI not configured');
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      // Get safe title WITHOUT template literals
      const safeTitle = this.convertToString(title);

      // Build prompt using only string concatenation
      const prompt =
        'Analyze this spiritual memory and provide insights in valid JSON format.' +
        '\n\n' +
        'Title: ' +
        safeTitle +
        '\n' +
        'Content: "' +
        body +
        '"' +
        '\n\n' +
        'Provide analysis with these exact fields:' +
        '\n' +
        '{' +
        '\n' +
        '  "themes": ["theme1", "theme2", "theme3"],' +
        '\n' +
        '  "emotionalTone": "positive" | "neutral" | "negative",' +
        '\n' +
        '  "suggestedVerses": ["John 3:16", "Psalm 23:1"],' +
        '\n' +
        '  "suggestedTags": ["prayer", "healing", "faith"],' +
        '\n' +
        '  "summary": "One sentence summary",' +
        '\n' +
        '  "keyTakeaway": "Main spiritual lesson"' +
        '\n' +
        '}' +
        '\n\n' +
        'Return ONLY valid JSON, no other text.';

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON with proper typing
      const parsedText = this.parseJSONFromText(text);

      // Validate the structure with type guards
      if (
        !Array.isArray(parsedText.themes) ||
        !['positive', 'neutral', 'negative'].includes(
          parsedText.emotionalTone,
        ) ||
        !Array.isArray(parsedText.suggestedVerses) ||
        !Array.isArray(parsedText.suggestedTags) ||
        typeof parsedText.summary !== 'string' ||
        typeof parsedText.keyTakeaway !== 'string'
      ) {
        throw new Error('Invalid insights structure returned from AI');
      }

      return {
        success: true,
        memoryId,
        insights: {
          themes: parsedText.themes,
          emotionalTone: parsedText.emotionalTone as
            | 'positive'
            | 'neutral'
            | 'negative',
          suggestedVerses: parsedText.suggestedVerses,
          suggestedTags: parsedText.suggestedTags,
          summary: parsedText.summary,
          keyTakeaway: parsedText.keyTakeaway,
        },
        processedAt: new Date().toISOString(),
        model: 'gemini-1.5-flash',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `AI insights failed for memory ${memoryId}:`,
        errorMessage,
      );

      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON response from AI');
      }

      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  private cleanAIResponse(text: string): string {
    let cleaned = text.trim();

    const prefixes = [
      /^Here is (?:the )?rephrased (?:version|memory)[:\s-]*/i,
      /^Rephrased[:\s-]*/i,
      /^Certainly! Here (?:is|are)[:\s-]*/i,
    ];

    prefixes.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove surrounding quotes
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    return cleaned.replace(/\s+/g, ' ').trim();
  }

  private parseJSONFromText(text: string): InsightsJSON {
    try {
      // Try direct parse first
      const parsed = JSON.parse(text) as InsightsJSON;
      return parsed;
    } catch {
      // Extract JSON from text if wrapped in other content
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        const parsed = JSON.parse(jsonMatch[0]) as InsightsJSON;
        return parsed;
      }
      throw new SyntaxError('No valid JSON found in AI response');
    }
  }

  // ULTIMATE FIX: Convert ANY value to string WITHOUT using String() or template literals
  private convertToString(value: unknown): string {
    // Handle null/undefined
    if (value == null) {
      return 'Untitled Memory';
    }

    // Already a string
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || 'Untitled Memory';
    }

    // Handle numbers (toString is safe on numbers)
    if (typeof value === 'number') {
      return value.toString();
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    // Handle bigint (toString is safe on bigint)
    if (typeof value === 'bigint') {
      return value.toString();
    }

    // Handle symbols (toString is safe on symbols)
    if (typeof value === 'symbol') {
      return value.toString();
    }

    // For objects, use JSON.stringify (ESLint-safe)
    if (typeof value === 'object') {
      try {
        const jsonStr = JSON.stringify(value);
        // Extract alphanumeric text from JSON, limit length
        const cleanStr = jsonStr
          .replace(/[^a-zA-Z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 100);
        return cleanStr || 'Untitled Memory';
      } catch {
        return 'Untitled Memory';
      }
    }

    // For functions, return function name or generic
    if (typeof value === 'function') {
      return value.name || 'Function';
    }

    // Should never reach here, but just in case
    return 'Untitled Memory';
  }
}
