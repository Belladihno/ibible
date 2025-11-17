import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;
  private logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST');
    const port = Number(this.config.get<string>('MAIL_PORT') || 587);
    const secure = false; // TLS with STARTTLS on port 587
    const user = this.config.get<string>('MAIL_USERNAME');
    const pass = this.config.get<string>('MAIL_PASSWORD');
    const from = this.config.get<string>('MAIL_FROM_ADDRESS') || user;
    const fromName = this.config.get<string>('MAIL_FROM_NAME') || '';

    //@ts-ignore
    this.fromAddress = fromName ? `"${fromName}" <${from}>` : from;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Send an HTML email using a saved template and inline image attachments (CID).
   * @param to recipient email address
   * @param subject email subject
   * @param templateName filename under src/email/templates (e.g. 'rea-welcome.html')
   * @param context optional map of simple replacements in template
   */
  async sendHtmlEmail(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, string> = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const templatePath = join(process.cwd(), 'src', 'email', 'templates', templateName);
    let html = readFileSync(templatePath, 'utf8');

  
    for (const [k, v] of Object.entries(context)) {
      html = html.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), v);
    }

   
    const attachments = [
      {
        filename: 'rea.svg',
        path: join(process.cwd(), 'src', 'email', 'images', 'rea.svg'),
        cid: 'rea-logo',
      },
      {
        filename: 'Ellipse 33.svg',
        path: join(process.cwd(), 'src', 'email', 'images', 'Ellipse 33.svg'),
        cid: 'ellipse-32',
      },
      {
        filename: 'Ellipse 34.svg',
        path: join(process.cwd(), 'src', 'email', 'images', 'Ellipse 34.svg'),
        cid: 'ellipse-33',
      },
    ];

    const mailOptions: nodemailer.SendMailOptions = {
      from: this.fromAddress,
      to,
      subject,
      html,
      attachments,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId} to ${to}`);
      return info;
    } catch (err) {
      this.logger.error('Failed to send email', err);
      throw err;
    }
  }
}
