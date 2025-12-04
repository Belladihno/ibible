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
      throw new Error(
        'DAILY_GEMINI_API_KEY is required for DailyVerseGeminiService',
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Generate reply in conversation context with verse reference
   */
  async generateReply(
    userMessage: string,
    history: { role: string; content: string }[],
    verseContext?: { reference: string; text: string },
  ): Promise<string> {
    const generationConfig: GenerationConfig = {
      temperature: 0.7,
      maxOutputTokens: 800,
      topP: 0.9,
      topK: 40,
    };

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Build system context with verse information
        let systemContext =
          'You are Rea, a warm and compassionate Bible study companion.';

        if (verseContext) {
          systemContext += `\n\nToday's Verse: ${verseContext.reference}\nVerse Text: "${verseContext.text}"\n\nIMPORTANT: Keep all your responses grounded in this specific verse and its meaning. When the user asks questions, relate your answers back to this verse.`;
        }

        if (history && history.length > 0) {
          // Sanitize roles for Gemini API
          const sanitized = history.map((h) => {
            let role = (h.role || '').toString().toLowerCase();
            if (role === 'user' || role === 'client' || role === 'human') {
              role = 'user';
            } else {
              role = 'model';
            }
            return { role, parts: [{ text: h.content }] };
          });

          // Build contents with system context at the beginning
          const contents: any[] = [
            { role: 'user', parts: [{ text: systemContext }] },
            {
              role: 'model',
              parts: [
                {
                  text: 'I understand. I will keep our conversation focused on this verse and its meaning.',
                },
              ],
            },
            ...sanitized,
            { role: 'user', parts: [{ text: userMessage }] },
          ];

          const result = await this.model.generateContent({
            contents,
            generationConfig,
          });

          const text = this.tryExtractText(result)?.trim();
          if (text && text.length > 0) return text;

          this.logger.warn(
            `DailyVerseGemini generateReply empty response (attempt ${attempt})`,
          );
        } else {
          // First message in conversation
          const fullPrompt = verseContext
            ? `${systemContext}\n\nUser: ${userMessage}`
            : userMessage;

          const result = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig,
          });

          const text = this.tryExtractText(result)?.trim();
          if (text && text.length > 0) return text;

          this.logger.warn(
            `DailyVerseGemini generateReply empty response (attempt ${attempt})`,
          );
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
    return `You are Rea, a warm and compassionate Bible study companion starting a conversation about today's verse.

Verse Reference: ${verse.reference}
Verse Text: "${verse.text}"

Your task: Write a warm, conversational opening that:
1. Briefly explains the CORE MESSAGE of this specific verse in simple, relatable language (2-3 sentences)
2. Makes it personal and relevant to everyday life
3. Ends with ONE engaging question that invites personal reflection

Important Guidelines:
- DO NOT repeat or quote the verse text directly
- Focus on the SPECIFIC meaning and message of THIS verse (not generic spiritual advice)
- Write as if you're starting a meaningful conversation with a friend
- Be warm, inviting, and thought-provoking

Example style (for John 3:16):
"God's love for humanity is so deep and unconditional that He made the ultimate sacrifice. This verse reminds us that eternal life is a gift freely offered to anyone who believes. 

Can you think of a time when you experienced unconditional love, or when you found it hard to accept love freely given?"

Now write your conversational opening for ${verse.reference}:`;
  }

  private buildStrictPrompt(verse: BibleVerse): string {
    return `You are Rea, beginning a Bible reflection conversation.

Verse: ${verse.reference} - "${verse.text}"

Write a conversational starter (2-3 sentences + one question) that:
- Explains THIS verse's specific meaning in your own words
- Connects it to daily life
- Invites personal reflection
- Uses COMPLETELY DIFFERENT words than the original verse

Be specific to THIS verse's message, not generic spiritual advice.`;
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

        const text = this.tryExtractText(result)?.trim();

        if (text && text.length > 0) {
          // Check if it's too generic or repetitive
          if (
            this.isMostlyRepeat(verse.text, text) ||
            this.isGenericFallback(text)
          ) {
            this.logger.warn(
              `Attempt ${attempt}: AI response too generic or repetitive, retrying`,
            );

            const strictPrompt = this.buildStrictPrompt(verse);
            const strictResult = await this.model.generateContent({
              contents: [{ role: 'user', parts: [{ text: strictPrompt }] }],
              generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 300,
                topP: 0.95,
              },
            });

            const strictText = this.tryExtractText(strictResult)?.trim();
            if (
              strictText &&
              !this.isMostlyRepeat(verse.text, strictText) &&
              !this.isGenericFallback(strictText)
            ) {
              return strictText;
            }

            if (attempt < maxAttempts) {
              await new Promise((r) => setTimeout(r, 300 * attempt));
              continue;
            }
          } else {
            return text;
          }
        }

        this.logger.warn(`Attempt ${attempt}: Empty response from Gemini`);
      } catch (err: any) {
        this.logger.error(`Attempt ${attempt} error: ${err?.message ?? err}`);
      }

      await new Promise((r) => setTimeout(r, 300 * attempt));
    }

    // If all attempts fail, generate a simple verse-specific fallback
    this.logger.error(
      'Failed to generate summary after retries — creating verse-specific fallback',
    );
    return this.generateSimpleFallback(verse);
  }

  /**
   * Check if the response is the generic fallback pattern
   */
  private isGenericFallback(text: string): boolean {
    const genericPhrases = [
      'this passage invites thoughtful reflection',
      'consider how the truth behind',
      'might shape a choice or change in your daily life',
      'what is one small step you could take this week',
    ];

    const lowerText = text.toLowerCase();
    const matchCount = genericPhrases.filter((phrase) =>
      lowerText.includes(phrase),
    ).length;

    // If 2 or more generic phrases are present, it's too generic
    return matchCount >= 2;
  }

  /**
   * Generate a simple but verse-specific fallback when AI fails
   */
  private generateSimpleFallback(verse: BibleVerse): string {
    // Extract key themes from common verses as fallback
    const reference = verse.reference.toLowerCase();

    if (reference.includes('john 3:16')) {
      return "God's love for humanity is immeasurable—so profound that He gave His only Son so that anyone who believes might have eternal life. This verse is the heart of the Gospel message.\n\nHow does knowing about this sacrificial love change the way you see yourself and others today?";
    }

    if (reference.includes('psalm 23')) {
      return "Even in the darkest valleys, we're never alone. This passage reminds us that God guides, comforts, and provides for us like a caring shepherd tends his flock.\n\nWhat 'valley' are you walking through right now, and how might you sense God's presence there?";
    }

    if (reference.includes('philippians 4:13')) {
      return "True strength doesn't come from our own abilities—it flows from Christ working in and through us. When we lean on Him, we can face challenges that would otherwise overwhelm us.\n\nWhat challenge are you facing where you need to rely on Christ's strength rather than your own?";
    }

    // Generic but better than the old fallback
    return `Today's verse from ${verse.reference} offers profound wisdom for our lives. Take a moment to reflect on its message and what it might be saying to you personally.\n\nWhat stands out to you most in this passage, and how might you apply it today?`;
  }

  private tryExtractText(result?: unknown): string | undefined {
    try {
      if (!result) return undefined;

      const r = result as unknown;

      try {
        const resp = (
          r as { response?: { text?: () => unknown } }
        )?.response?.text?.();
        if (typeof resp === 'string' && resp.trim().length > 0) return resp;
      } catch {
        // ignore
      }

      const candidates = (r as { candidates?: unknown })?.candidates;
      if (Array.isArray(candidates) && candidates.length > 0) {
        const first = candidates[0] as unknown;
        if (typeof first === 'string' && first.trim().length > 0) return first;

        const firstOutput = (first as { output?: unknown })?.output;
        if (typeof firstOutput === 'string' && firstOutput.trim().length > 0)
          return firstOutput;

        if (
          Array.isArray(firstOutput) &&
          firstOutput.length > 0 &&
          typeof firstOutput[0] === 'string'
        )
          return firstOutput[0];
      }

      const outputs = (r as { outputs?: unknown })?.outputs;
      if (Array.isArray(outputs) && outputs.length > 0) {
        for (const o of outputs as unknown[]) {
          const content = (o as { content?: unknown })?.content;
          if (typeof content === 'string' && content.trim().length > 0)
            return content;

          if (Array.isArray(content)) {
            for (const part of content as unknown[]) {
              const partText = (part as { text?: unknown })?.text;
              if (typeof partText === 'string' && partText.trim().length > 0)
                return partText;
            }
          }
        }
      }
    } catch (e) {
      this.logger.debug(
        'tryExtractText encountered error: ' + (e?.message ?? e),
      );
    }

    return undefined;
  }

  private isMostlyRepeat(source: string, candidate: string): boolean {
    const sourceWords = this.normalizeText(source).split(' ').filter(Boolean);
    const candidateWords = this.normalizeText(candidate)
      .split(' ')
      .filter(Boolean);

    if (sourceWords.length === 0 || candidateWords.length === 0) return false;

    const sourceSet = new Set(sourceWords);
    let matchCount = 0;

    for (const word of candidateWords) {
      if (sourceSet.has(word)) matchCount++;
    }

    const overlapPercent = (matchCount / candidateWords.length) * 100;

    this.logger.debug(
      `Overlap check: ${matchCount}/${candidateWords.length} words (${overlapPercent.toFixed(1)}%)`,
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
