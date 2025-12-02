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
    this.apiKey = this.configService.getOrThrow<string>('APOLLO_API_KEY');
    this.sequenceId =
      this.configService.getOrThrow<string>('APOLLO_SEQUENCE_ID');
  }

  async addLead(email: string, name?: string): Promise<SalesToolResponse> {
    const [firstName, ...lastNameParts] = (name || '').split(' ');
    const lastName = lastNameParts.join(' ') || undefined;

    const leadData: ApolloLeadData = {
      email,
      first_name: firstName || undefined,
      last_name: lastName,
      sequence_id: this.sequenceId,
    };

    try {
      const response = await fetch(
        `${this.apiUrl}/emailer_campaigns/add_contact_to_campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apiKey,
          },
          body: JSON.stringify(leadData),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
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
