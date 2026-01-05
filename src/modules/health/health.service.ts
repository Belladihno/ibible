import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmailService } from 'src/modules/email/email.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { BibleService } from '../bible/bible.service';
import { GeminiService } from '../gemini/gemini.service';
import { ReaFeature } from 'src/shared/enums';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  private readonly redis: Redis;

  constructor(
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiService,
    private readonly bibleService: BibleService,
  ) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  async check() {
    const results: {
      database: { status: 'up' | 'down'; detail?: string };
      smtp: { status: 'up' | 'down'; detail?: string };
      redis: { status: 'up' | 'down'; detail?: string };
      gemini: { status: 'up' | 'down'; detail?: string };
      bibleApi: { status: 'up' | 'down'; detail?: string };
    } = {
      database: { status: 'down' },
      smtp: { status: 'down' },
      redis: { status: 'down' },
      gemini: { status: 'down' },
      bibleApi: { status: 'down' },
    };
    // Helper to add timeout to promises
    const withTimeout = async <T>(
      p: Promise<T>,
      ms = 3000,
      name = '',
    ): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`${name || 'operation'} timed out after ${ms}ms`));
        }, ms);
        p.then((v) => {
          clearTimeout(timer);
          resolve(v);
        }).catch((e) => {
          clearTimeout(timer);
          reject(e instanceof Error ? e : new Error(String(e)));
        });
      });
    };

    // Prepare parallel checks with conservative timeouts
    const bibleCheck = withTimeout(
      this.bibleService.getBooks(),
      3000,
      'Bible API',
    )
      .then(() => ({
        key: 'bibleApi',
        status: 'up',
        detail: 'Bible API responded',
      }))
      .catch((err: unknown) => ({
        key: 'bibleApi',
        status: 'down',
        detail: err instanceof Error ? err.message : String(err),
      }));

    const geminiCheck = withTimeout(
      this.geminiService.generate(
        ReaFeature.CHAT,
        'Reply with a single word: pong',
        {
          temperature: 0,
          maxTokens: 5,
        },
      ),
      5000,
      'Gemini',
    )
      .then((res) => ({
        key: 'gemini',
        status: 'up',
        detail: String(res.content).toLowerCase().includes('pong')
          ? 'Gemini API responded'
          : 'Gemini API returned unexpected response',
      }))
      .catch((err: unknown) => ({
        key: 'gemini',
        status: 'down',
        detail: err instanceof Error ? err.message : String(err),
      }));

    const redisCheck = withTimeout(
      this.redis.ping() as Promise<string>,
      1000,
      'Redis',
    )
      .then((pong) => ({
        key: 'redis',
        status: pong === 'PONG' ? 'up' : 'down',
        detail:
          pong === 'PONG'
            ? 'Redis ping successful'
            : `Unexpected Redis ping response: ${String(pong)}`,
      }))
      .catch((err: unknown) => ({
        key: 'redis',
        status: 'down',
        detail: err instanceof Error ? err.message : String(err),
      }));

    const dbCheck = withTimeout(
      this.dataSource.query('SELECT 1'),
      2000,
      'Postgres',
    )
      .then(() => ({
        key: 'database',
        status: 'up',
        detail: 'Connection successful',
      }))
      .catch((err: unknown) => ({
        key: 'database',
        status: 'down',
        detail: err instanceof Error ? err.message : String(err),
      }));

    const smtpCheck = withTimeout(
      this.emailService.verifySMTPConnection(),
      2000,
      'SMTP',
    )
      .then((ok) => ({
        key: 'smtp',
        status: ok ? 'up' : 'down',
        detail: ok ? 'SMTP verified' : 'SMTP verification failed',
      }))
      .catch((err: unknown) => ({
        key: 'smtp',
        status: 'down',
        detail: err instanceof Error ? err.message : String(err),
      }));

    // Run remaining checks in parallel and merge results
    const settled = await Promise.allSettled([
      bibleCheck,
      geminiCheck,
      redisCheck,
      dbCheck,
      smtpCheck,
    ]);
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        const v = s.value as {
          key: string;
          status: 'up' | 'down';
          detail?: string;
        };
        results[v.key] = { status: v.status, detail: v.detail };
      }
    }

    const overallStatus =
      results.database.status === 'up' &&
      results.smtp.status === 'up' &&
      results.redis.status === 'up' &&
      results.gemini.status === 'up' &&
      results.bibleApi.status === 'up'
        ? 'ok'
        : 'degraded';

    return {
      status: overallStatus,
      checks: results,
    };
  }
}
