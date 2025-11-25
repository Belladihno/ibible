import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  async listAvailableModels(): Promise<any[]> {
    try {
      // Using the Google Generative AI API to list models
      const response = await this.genAI
        .getGenerativeModel({ model: 'gemini-pro' })
        .generateContent({
          contents: [{ role: 'user', parts: [{ text: 'test' }] }],
        })
        .catch(() => {
          // If the call fails, we'll try to list models differently
        });

      // Actually, to list all models we need a different approach
      // This requires fetching from the models endpoint directly
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      const response2 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );

      if (!response2.ok) {
        throw new Error(`HTTP error! status: ${response2.status}`);
      }

      const data = await response2.json();
      return data.models || [];
    } catch (error) {
      this.logger.error(`Error listing models: ${error.message}`);
      throw error;
    }
  }
}
