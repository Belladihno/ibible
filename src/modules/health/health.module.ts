import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { EmailModule } from '../email/email.module';
import { ChatModule } from '../chat/chat.module';
import { BibleModule } from '../bible/bible.module';

@Module({
  imports: [EmailModule, ChatModule, BibleModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
