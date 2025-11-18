/**
 * Enum of all available email templates
 * Each value corresponds to the template filename in the templates directory
 * For every new created template, its template ID must be added here
 */
export enum EmailTemplateId {
  WAITLIST = 'waitlist.njk',
  EMAIL_VERIFICATION = 'email-verification.njk',
}
