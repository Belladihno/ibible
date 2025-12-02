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
    this.apiKey = this.configService.getOrThrow<string>('INSTANTLY_API_KEY');
    this.campaignId = this.configService.getOrThrow<string>(
      'INSTANTLY_CAMPAIGN_ID',
    );
  }

  async addLead(email: string, name?: string): Promise<SalesToolResponse> {
    const [firstName, ...lastNameParts] = (name || '').split(' ');
    const lastName = lastNameParts.join(' ') || undefined;

    const leadData: InstantlyLeadData = {
      email,
      first_name: firstName || undefined,
      last_name: lastName,
      campaign_id: this.campaignId,
    };

    try {
      const response = await fetch(`${this.apiUrl}/lead/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(leadData),
      });

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
