import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as nunjucks from 'nunjucks';

import { join } from 'path';
import {
  EmailPayload,
  EmailSendResult,
  EmailServiceConfig,
  EmailRecipient,
} from './types/email.types';
import { EmailTemplateId } from './constants/email-template.enum';
import { validateTemplateData } from './constants/email-template.registry';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly config: EmailServiceConfig;
  private readonly nunjucksEnv: nunjucks.Environment;

  constructor(private readonly configService: ConfigService) {
    this.config = this.initializeConfig();

    this.transporter = this.initializeTransporter();

    this.nunjucksEnv = this.initializeNunjucks();

    this.logger.log('Email service initialized successfully');
  }

  private initializeConfig(): EmailServiceConfig {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = Number(this.configService.get<string>('EMAIL_PORT') || 587);
    const user = this.configService.get<string>('EMAIL_USERNAME');
    const pass = this.configService.get<string>('EMAIL_PASSWORD');
    const fromEmail =
      this.configService.get<string>('EMAIL_FROM_ADDRESS') || user;
    const fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'Rea';

    if (!host || !user || !pass) {
      throw new Error(
        'Email configuration incomplete. Please check EMAIL_HOST, EMAIL_USERNAME, and EMAIL_PASSWORD environment variables.',
      );
    }

    return {
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      from: {
        email: fromEmail || '',
        name: fromName,
      },
    };
  }

  private initializeTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  private initializeNunjucks(): nunjucks.Environment {
    const templatesPath = join(process.cwd(), 'templates');
    return nunjucks.configure(templatesPath, {
      autoescape: true,
      trimBlocks: true,
      lstripBlocks: true,
    });
  }

  private formatRecipient(recipient: EmailRecipient): string {
    if (recipient.name) {
      return `"${recipient.name}" <${recipient.email}>`;
    }
    return recipient.email;
  }

  private renderTemplate<T extends EmailTemplateId>(
    templateId: T,
    templateData: Record<string, string | number | boolean | undefined>,
  ): string {
    try {
      validateTemplateData(templateId, templateData);

      const context = {
        ...templateData,
        copyRightYear: new Date().getFullYear(),
      };

      const html = this.nunjucksEnv.render(templateId, context);

      return html;
    } catch (error) {
      this.logger.error(
        `Failed to render template ${templateId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new Error(
        `Template rendering failed for ${templateId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Get inline attachments for email templates (images with CID references)
  private getInlineAttachments(templateId: EmailTemplateId): Array<{
    filename: string;
    path: string;
    cid: string;
  }> {
    // Only add attachments for templates that require them
    if (templateId === EmailTemplateId.WAITLIST) {
      return [
        {
          filename: 'rea.png',
          path: join(process.cwd(), 'templates/images/rea.png'),
          cid: 'logo',
        },
        {
          filename: 'Ellipse 33.png',
          path: join(process.cwd(), 'templates/images/Ellipse 33.png'),
          cid: 'ellipse-one',
        },
        {
          filename: 'Ellipse 34.png',
          path: join(process.cwd(), 'templates/images/Ellipse 34.png'),
          cid: 'ellipse-two',
        },
      ];
    }
    return [];
  }

  async sendMail<T extends EmailTemplateId>(
    payload: EmailPayload<T>,
  ): Promise<EmailSendResult> {
    try {
      const html = this.renderTemplate(
        payload.templateId,
        payload.templateData,
      );

      const from = payload.from
        ? this.formatRecipient(payload.from)
        : this.formatRecipient(this.config.from);

      const to = payload.to.map((recipient) => this.formatRecipient(recipient));

      const inlineAttachments = this.getInlineAttachments(payload.templateId);
      const allAttachments = payload.attachments
        ? [...inlineAttachments, ...payload.attachments]
        : inlineAttachments;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: nodemailer.SentMessageInfo =
        await this.transporter.sendMail({
          from,
          to,
          subject: payload.subject,
          html,
          text: payload.text,
          attachments: allAttachments,
        });

      const messageId = String(result.messageId || 'unknown');

      this.logger.log(
        `Email sent successfully: ${messageId} to ${to.join(', ')}`,
      );

      return {
        messageId,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email: ${errorMessage}`,
        error instanceof Error ? error.stack : error,
      );

      return {
        messageId: '',
        success: false,
        error: errorMessage,
      };
    }
  }

  async verifySMTPConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error(
        `SMTP connection verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }
}
