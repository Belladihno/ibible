import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GoogleModel,
  GoogleModelListResponse,
} from 'src/shared/interfaces/model-listing.interface';

@Injectable()
export class ModelListingService {
  private readonly logger = new Logger(ModelListingService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error(
        'GEMINI_API_KEY is not configured in environment variables',
      );
      throw new Error('GEMINI_API_KEY is required for AI functionality');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async listAvailableModels(): Promise<GoogleModel[]> {
    try {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as GoogleModelListResponse;

      return data.models ?? [];
    } catch (error: any) {
      this.logger.error(`Error listing models: ${error.message}`);
      throw error;
    }
  }
}
