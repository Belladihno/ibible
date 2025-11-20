import { EmailTemplateId } from 'src/modules/email';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  path?: string;
  cid?: string;
}

export interface BaseEmailTemplateContext {
  copyRightYear: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * START INDIVIDUAL TEMPLATE CONTEXT INTERFACES DEFINITIONS
 * For each email template, define its specific context interface here
 **/
export interface WaitlistEmailTemplateContext extends BaseEmailTemplateContext {
  name: string;
  unsubscribeUrl?: string;
}

export interface EmailVerificationTemplateContext
  extends BaseEmailTemplateContext {
  verificationLink: string;
  userName: string;
  expirationHours: number;
}
/** END INDIVIDUAL TEMPLATE CONTEXT INTERFACES DEFINITIONS **/

export interface EmailTemplateContextMap {
  [EmailTemplateId.WAITLIST]: WaitlistEmailTemplateContext;
  [EmailTemplateId.EMAIL_VERIFICATION]: EmailVerificationTemplateContext;
}

export interface EmailPayload<T extends EmailTemplateId = EmailTemplateId> {
  from?: EmailRecipient;
  to: EmailRecipient[];
  subject: string;
  templateId: T;
  templateData: T extends keyof EmailTemplateContextMap
    ? Omit<EmailTemplateContextMap[T], 'copyRightYear'>
    : Record<string, string | number | boolean | undefined>;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export interface EmailServiceConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    email: string;
    name: string;
  };
}
