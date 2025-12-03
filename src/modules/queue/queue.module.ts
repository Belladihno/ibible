import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueName } from './queue-names.enum';
import { QueueManagerService } from './queue.service';
import { QueueController } from './queue.controller';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
          // Add retry strategy
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          // Connection timeout
          connectTimeout: 10000,
          // Enable offline queue
          enableOfflineQueue: true,
          maxRetriesPerRequest: null,
        },
        // Global job options
        defaultJobOptions: {
          removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
            count: 5000, // Keep last 5000 failed jobs
          },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: QueueName.WAITLIST_SYNC }),
  ],
  providers: [QueueManagerService],
  controllers: [QueueController],
  exports: [BullModule, QueueManagerService],
})
export class QueueModule {}
