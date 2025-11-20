import { EmailTemplateId } from './email-template.enum';

interface EmailTemplateMetadata {
  id: EmailTemplateId;
  name: string;
  description: string;
  requiredFields: string[];
}

/**
 * Registry of all email templates with their metadata
 * Centralized configuration for all templates
 * For every new created template, its entry must be added here to the registry
 */
export const EMAIL_TEMPLATE_REGISTRY: Record<
  EmailTemplateId,
  EmailTemplateMetadata
> = {
  [EmailTemplateId.WAITLIST]: {
    id: EmailTemplateId.WAITLIST,
    name: 'Waitlist Email',
    description: 'Waitlist email for new waitlist subscribers',
    requiredFields: ['name'],
  },
  [EmailTemplateId.EMAIL_VERIFICATION]: {
    id: EmailTemplateId.EMAIL_VERIFICATION,
    name: 'Email Verification',
    description: 'Email sent to users to verify their email address',
    requiredFields: ['otp', 'userName', 'expirationMinutes'],
  },
};

export function getTemplateMetadata(
  templateId: EmailTemplateId,
): EmailTemplateMetadata {
  const metadata = EMAIL_TEMPLATE_REGISTRY[templateId];
  if (!metadata) {
    throw new Error(`Template metadata not found for: ${templateId}`);
  }
  return metadata;
}

export function validateTemplateData(
  templateId: EmailTemplateId,
  data: Record<string, unknown>,
): void {
  const metadata = getTemplateMetadata(templateId);
  const missingFields = metadata.requiredFields.filter(
    (field) => !(field in data),
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields for template ${templateId}: ${missingFields.join(', ')}`,
    );
  }
}
