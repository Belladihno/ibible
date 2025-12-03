import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InstantlyApiResponse,
  InstantlyLeadData,
  SalesToolResponse,
} from 'src/shared/interfaces/sales.interface';

@Injectable()
export class InstantlyService {
  private readonly logger = new Logger(InstantlyService.name);
  private readonly apiUrl = 'https://api.instantly.ai/api/v1';
  private readonly apiKey: string;
  private readonly campaignId: string;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'production') {
      this.apiKey = this.configService.getOrThrow<string>('INSTANTLY_API_KEY');
      this.campaignId = this.configService.getOrThrow<string>(
        'INSTANTLY_CAMPAIGN_ID',
      );
    } else {
      this.apiKey = this.configService.get<string>('INSTANTLY_API_KEY', '');
      this.campaignId = this.configService.get<string>(
        'INSTANTLY_CAMPAIGN_ID',
        '',
      );

      if (!this.apiKey || !this.campaignId) {
        this.logger.warn(
          'Instantly.ai credentials not configured - service will fail gracefully',
        );
      }
    }
  }

  async addLead(email: string, name?: string): Promise<SalesToolResponse> {
    if (!this.apiKey || !this.campaignId) {
      this.logger.warn(
        `Instantly.ai not configured - skipping lead sync for ${email}`,
      );
      return {
        success: false,
        tool: 'instantly',
        error: 'Service not configured',
      };
    }

    const [firstName, ...lastNameParts] = (name || '').split(' ');
    const lastName = lastNameParts.join(' ') || undefined;

    const leadData: InstantlyLeadData = {
      email,
      first_name: firstName || undefined,
      last_name: lastName,
      campaign_id: this.campaignId,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${this.apiUrl}/lead/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(leadData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Instantly API error: ${response.status} - ${errorText}`,
        );
      }

      const result: InstantlyApiResponse = await response.json();

      if (!result.success) {
        throw new Error(
          `Instantly API returned unsuccessful response: ${result.message ?? ''}`,
        );
      }

      this.logger.log(`Lead successfully added to Instantly: ${email}`);
      return {
        success: true,
        tool: 'instantly',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to add lead to Instantly for email ${email}: ${errorMessage}`,
      );

      return {
        success: false,
        tool: 'instantly',
        error: errorMessage,
      };
    }
  }
}
