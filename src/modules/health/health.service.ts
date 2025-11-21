import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmailService } from 'src/modules/email/email.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {}

  async check() {
    const results: {
      database: { status: 'up' | 'down'; detail?: string };
      smtp: { status: 'up' | 'down'; detail?: string };
    } = {
      database: { status: 'down' },
      smtp: { status: 'down' },
    };

    // Check database connectivity
    try {
      // simple lightweight query
      await this.dataSource.query('SELECT 1');
      results.database.status = 'up';
      results.database.detail = 'Connection successful';
    } catch (error: unknown) {
      results.database.status = 'down';
      results.database.detail =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Database health check failed', error as any);
    }

    // Check SMTP
    try {
      const ok = await this.emailService.verifySMTPConnection();
      results.smtp.status = ok ? 'up' : 'down';
      results.smtp.detail = ok ? 'SMTP verified' : 'SMTP verification failed';
    } catch (error: unknown) {
      results.smtp.status = 'down';
      results.smtp.detail =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('SMTP health check failed', error as any);
    }

    const overallStatus =
      results.database.status === 'up' && results.smtp.status === 'up'
        ? 'ok'
        : 'degraded';

    return {
      status: overallStatus,
      checks: results,
    };
  }
}
