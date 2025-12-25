import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { EmailModule } from '../email/email.module';
import { ChatModule } from '../chat/chat.module';
import { BibleModule } from '../bible/bible.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [EmailModule, ChatModule, BibleModule, GeminiModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
