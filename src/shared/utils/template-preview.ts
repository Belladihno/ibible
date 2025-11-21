import * as nunjucks from 'nunjucks';
import { join, dirname } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { EmailTemplateId, validateTemplateData } from 'src/modules/email';

export class TemplatePreviewUtil {
  private static nunjucksEnv: nunjucks.Environment;

  private static initializeNunjucks(): void {
    if (!this.nunjucksEnv) {
      const templatesPath = join(process.cwd(), 'templates');
      this.nunjucksEnv = nunjucks.configure(templatesPath, {
        autoescape: true,
        trimBlocks: true,
        lstripBlocks: true,
      });
    }
  }

  static renderTemplate<T extends EmailTemplateId>(
    templateId: T,
    templateData: Record<string, string | number | boolean | undefined>,
  ): string {
    this.initializeNunjucks();

    validateTemplateData(templateId, templateData);

    const context = {
      ...templateData,
      copyRightYear: new Date().getFullYear(),
    };

    return this.nunjucksEnv.render(templateId, context);
  }

  static generatePreviewFile<T extends EmailTemplateId>(
    templateId: T,
    templateData: Record<string, string | number | boolean | undefined>,
    outputPath?: string,
  ): string {
    const html = this.renderTemplate(templateId, templateData);

    // Determine output path
    const previewDir = join(process.cwd(), 'template-previews');
    const defaultPath = join(previewDir, templateId.replace('.njk', '.html'));
    const finalPath = outputPath || defaultPath;

    // Create preview directory if it doesn't exist
    const dir = dirname(finalPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(finalPath, html, 'utf-8');

    return finalPath;
  }

  static generateAllPreviews(): Record<EmailTemplateId, string> {
    const previews: Record<string, string> = {};

    const sampleData: Record<EmailTemplateId, Record<string, unknown>> = {
      [EmailTemplateId.WAITLIST]: {
        name: 'Aba Nicaisse',
        unsubscribeUrl: 'https://rea.com/waitlist/unsubscribe',
      },
      [EmailTemplateId.EMAIL_VERIFICATION]: {
        userName: 'Aba Nicaisse',
        verificationLink: 'https://rea.com/email-verify?token=abc123',
        expirationHours: 24,
      },
      [EmailTemplateId.PASSWORD_RESET]: {
        userName: 'Aba Nicaisse',
        otp: '123456',
        expirationHours: 1,
      },
    };

    for (const [templateId, data] of Object.entries(sampleData)) {
      const path = this.generatePreviewFile(
        templateId as EmailTemplateId,
        data as Record<string, string | number | boolean | undefined>,
      );
      previews[templateId] = path;
    }

    return previews as Record<EmailTemplateId, string>;
  }
}

// Auto-generate previews when the file is run directly
// Usage: npx ts-node -r tsconfig-paths/register src/utils/template-preview.ts
if (require.main === module) {
  console.log('Generating email template previews...\n');

  const previews = TemplatePreviewUtil.generateAllPreviews();

  console.log('|=> Preview files generated successfully:\n');
  for (const [templateId, path] of Object.entries(previews)) {
    console.log(`  📧 ${templateId}: ${path}`);
  }

  console.log('\n Open these files in your browser to preview the emails');
  console.log('   Example: open preview/waitlist.html\n');
}
