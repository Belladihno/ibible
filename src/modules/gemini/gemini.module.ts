import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { RedisModule } from '../redis/redis.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';

@Module({
  imports: [ConfigModule, RedisModule, AiUsageModule],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
