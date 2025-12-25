import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
