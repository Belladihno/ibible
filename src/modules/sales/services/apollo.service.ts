import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApolloApiResponse,
  ApolloLeadData,
  SalesToolResponse,
} from 'src/shared/interfaces/sales.interface';

@Injectable()
export class ApolloService {
  private readonly logger = new Logger(ApolloService.name);
  private readonly apiUrl = 'https://api.apollo.io/v1';
  private readonly apiKey: string;
  private readonly sequenceId: string;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'production') {
      this.apiKey = this.configService.getOrThrow<string>('APOLLO_API_KEY');
      this.sequenceId =
        this.configService.getOrThrow<string>('APOLLO_SEQUENCE_ID');
    } else {
      this.apiKey = this.configService.get<string>('APOLLO_API_KEY', '') ?? '';
      this.sequenceId =
        this.configService.get<string>('APOLLO_SEQUENCE_ID', '') ?? '';

      if (!this.apiKey || !this.sequenceId) {
        this.logger.warn(
          'Apollo.io credentials not configured - service will fail gracefully',
        );
        this.logger.warn(
          'Set APOLLO_API_KEY and APOLLO_SEQUENCE_ID in your .env file',
        );
      }
    }
  }

  async addLead(email: string, name?: string): Promise<SalesToolResponse> {
    if (!this.apiKey || !this.sequenceId) {
      this.logger.warn(
        `Apollo.io not configured - skipping lead sync for ${email}`,
      );

      return {
        success: false,
        tool: 'apollo',
        error:
          'Service not configured - missing APOLLO_API_KEY or APOLLO_SEQUENCE_ID',
      };
    }

    const [firstName, ...lastNameParts] = (name || '').split(' ');
    const lastName = lastNameParts.join(' ') || undefined;

    const leadData: ApolloLeadData = {
      email,
      first_name: firstName || undefined,
      last_name: lastName,
      sequence_id: this.sequenceId,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Try the emailer campaigns endpoint first (for adding to sequence)
      this.logger.debug(`Attempting to add lead to Apollo sequence: ${email}`);
      this.logger.debug(
        `API URL: ${this.apiUrl}/emailer_campaigns/add_contact_to_campaign`,
      );
      this.logger.debug(`API Key: ${this.apiKey.substring(0, 10)}...`);
      this.logger.debug(`Sequence ID: ${this.sequenceId}`);

      const response = await fetch(
        `${this.apiUrl}/emailer_campaigns/add_contact_to_campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apiKey,
          },
          body: JSON.stringify(leadData),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Apollo API error: ${response.status} - ${errorText}`,
        );

        // If it's a 404, the endpoint might not be available
        if (response.status === 404) {
          this.logger.warn(
            'Emailer campaigns endpoint not available. You may need to:',
          );
          this.logger.warn(
            '   1. Verify your Apollo plan includes sequences/campaigns',
          );
          this.logger.warn('   2. Create a master API key');
          this.logger.warn('   3. Contact Apollo support for API access');
        }

        throw new Error(`Apollo API error: ${response.status} - ${errorText}`);
      }

      const result: ApolloApiResponse = await response.json();

      if (!result.success) {
        throw new Error(
          `Apollo API returned unsuccessful response: ${result.message ?? ''}`,
        );
      }

      this.logger.log(`Lead successfully added to Apollo: ${email}`);
      return {
        success: true,
        tool: 'apollo',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to add lead to Apollo for email ${email}: ${errorMessage}`,
      );

      return {
        success: false,
        tool: 'apollo',
        error: errorMessage,
      };
    }
  }
}
