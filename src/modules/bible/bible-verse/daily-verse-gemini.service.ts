import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
  GenerateContentResult,
} from '@google/generative-ai';
import { BibleVerse } from 'src/shared/types/bible-verse.types';

@Injectable()
export class DailyVerseGeminiService {
  private readonly logger = new Logger(DailyVerseGeminiService.name);
  private readonly model: GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('PRAYER_GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('DAILY_GEMINI_API_KEY is required for DailyVerseGeminiService');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }



  async generateReply(userMessage: string, history: { role: string; content: string }[]): Promise<string> {
    // Build a chat history compatible with the generative API
    const generationConfig: GenerationConfig = {
      temperature: 0.7,
      maxOutputTokens: 800,
      topP: 0.9,
      topK: 40,
    };

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (history && history.length > 0) {
          // Sanitize historical roles and build contents array where the FIRST content
          // is the current user message (Gemini requires first content be role 'user').
          const sanitized = history.map((h) => {
            let role = (h.role || '').toString().toLowerCase();
            if (role === 'user' || role === 'client' || role === 'human') {
              role = 'user';
            } else {
              role = 'model';
            }
            return { role, parts: [{ text: h.content }] };
          });

          const contents: any[] = [{ role: 'user', parts: [{ text: userMessage }] }, ...sanitized];

          const result = await this.model.generateContent({ contents, generationConfig });
          const text = this.tryExtractText(result)?.trim() ?? result?.response?.text?.()?.trim();
          if (text && text.length > 0) return text;
          this.logger.warn(`DailyVerseGemini generateReply empty response (attempt ${attempt})`);
        } else {
          const result = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig,
          });
          const text = this.tryExtractText(result)?.trim() ?? result?.response?.text?.()?.trim();
          if (text && text.length > 0) return text;
          this.logger.warn(`DailyVerseGemini generateReply empty response (attempt ${attempt})`);
        }
      } catch (err: any) {
        this.logger.warn(
          `DailyVerseGemini generateReply attempt ${attempt} error: ${err?.message ?? err}`,
        );
        if (attempt === maxAttempts) throw err;
      }

      await new Promise((r) => setTimeout(r, 300 * attempt));
    }

    throw new Error('server busy, try again');
  }

  private buildPrompt(verse: BibleVerse): string {
  return `You are Rea, a warm and compassionate Bible study companion.

Your task: Create an engaging, conversational reflection on this verse WITHOUT repeating the verse text itself.

Verse Reference: ${verse.reference}
Verse Text: "${verse.text}"

Instructions:
1. DO NOT copy or repeat any part of the verse text
2. Write 2-3 sentences explaining what this verse means in simple, everyday language
3. Share how this truth might impact someone's daily life
4. End with ONE thoughtful question that invites the reader to reflect personally

Format your response as:
[Your 2-3 sentence explanation]

[Your reflective question]

Keep it warm, personal, and conversational - like a friend sharing an insight over coffee.`;
}

private buildStrictPrompt(verse: BibleVerse): string {
  return `You are Rea, a Bible study companion.

CRITICAL: Write a brief reflection WITHOUT using any words from the original verse.

Verse: ${verse.reference} - "${verse.text}"

Task:
- Explain the core meaning in completely different words
- Make it practical and relatable (2-3 sentences)
- Add one personal reflection question

Start your response immediately with your explanation. No preamble.`;
}

async summarizeVerse(verse: BibleVerse): Promise<string> {
  const prompt = this.buildPrompt(verse);

  const generationConfig: GenerationConfig = {
    temperature: 0.8,
    maxOutputTokens: 300,
    topP: 0.95,
    topK: 50,
  };

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result: GenerateContentResult = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      // Extract text using helper that handles several SDK shapes
      const text = this.tryExtractText(result)?.trim();

      if (text && text.length > 0) {
        // Check if response is mostly repeating the verse
        if (this.isMostlyRepeat(verse.text, text)) {
          this.logger.warn(`Attempt ${attempt}: AI repeated verse, retrying with stricter prompt`);

          // Try with stricter prompt
          const strictPrompt = this.buildStrictPrompt(verse);
          const strictResult = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: strictPrompt }] }],
            generationConfig: {
              temperature: 0.9, // Even more creative
              maxOutputTokens: 300,
              topP: 0.95,
            },
          });

          const strictText = this.tryExtractText(strictResult)?.trim();
          if (strictText && !this.isMostlyRepeat(verse.text, strictText)) {
            return strictText;
          }

          // If still repeating, try one more time with backoff
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 300 * attempt));
            continue;
          }
        } else {
          // Success! Return the good summary
          return text;
        }
      }

      // No usable text — log result for debugging
      this.logger.warn(`Attempt ${attempt}: Empty response from Gemini`);
      this.logger.debug(`Full result (attempt ${attempt}): ${JSON.stringify(result).slice(0, 2000)}`);
    } catch (err: any) {
      this.logger.error(`Attempt ${attempt} error: ${err?.message ?? err}`);
      // don't rethrow here — we'll fall through to a graceful fallback after attempts
    }

    await new Promise((r) => setTimeout(r, 300 * attempt));
  }

  // Graceful fallback: return a short, non-repetitive reflection instead of throwing
  this.logger.error('Failed to generate non-repetitive summary after retries — returning fallback summary');
  return `This passage invites thoughtful reflection on its meaning and practical effect. Consider how the truth behind ${verse.reference} might shape a choice or change in your daily life.\n\nWhat is one small step you could take this week in response to this passage?`;
}

private tryExtractText(result?: GenerateContentResult): string | undefined {
  try {
    if (!result) return undefined;

    // Common accessor used in other parts of the code
    const respText = (result as any)?.response?.text?.();
    if (typeof respText === 'string' && respText.trim().length > 0) return respText;

    const candidates = (result as any)?.candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const first = candidates[0];
      if (typeof first === 'string' && first.trim().length > 0) return first;
      if (typeof first?.output === 'string' && first.output.trim().length > 0) return first.output;
      if (Array.isArray(first?.output) && first.output.length > 0 && typeof first.output[0] === 'string') return first.output[0];
    }

    const outputs = (result as any)?.outputs;
    if (Array.isArray(outputs) && outputs.length > 0) {
      for (const o of outputs) {
        if (typeof o?.content === 'string' && o.content.trim().length > 0) return o.content;
        if (Array.isArray(o?.content)) {
          for (const part of o.content) {
            if (typeof part?.text === 'string' && part.text.trim().length > 0) return part.text;
          }
        }
      }
    }
  } catch (e) {
    this.logger.debug('tryExtractText encountered error: ' + ((e as any)?.message ?? e));
  }

  return undefined;
}

private isMostlyRepeat(source: string, candidate: string): boolean {
  const sourceWords = this.normalizeText(source).split(' ').filter(Boolean);
  const candidateWords = this.normalizeText(candidate).split(' ').filter(Boolean);
  
  if (sourceWords.length === 0 || candidateWords.length === 0) return false;

  const sourceSet = new Set(sourceWords);
  let matchCount = 0;
  
  for (const word of candidateWords) {
    if (sourceSet.has(word)) matchCount++;
  }
  
  // Calculate overlap percentage
  const overlapPercent = (matchCount / candidateWords.length) * 100;
  
  this.logger.debug(
    `Overlap check: ${matchCount}/${candidateWords.length} words (${overlapPercent.toFixed(1)}%)`
  );
  
  return overlapPercent > 40;
}

private normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


}
