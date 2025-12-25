import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { QueueName } from './queue-names.enum';
import { QueueManagerService } from './queue.service';
import { QueueController } from './queue.controller';
import { MemoriesAiProcessor } from './processors/memories-ai.processor';
import { AccessToken } from 'src/entities/access-token.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import appConfig from 'src/config/auth.config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AccessToken]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          connectTimeout: 10000,
          enableOfflineQueue: true,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 3600,
            count: 5000,
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
    BullModule.registerQueue(
      { name: QueueName.WAITLIST_SYNC },
      { name: QueueName.CHAT_PROCESSING },
      {
        name: QueueName.MEMORIES_PROCESSING,
        defaultJobOptions: {
          removeOnComplete: { age: 3600, count: 500 },
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
        },
      },
      { name: QueueName.MEDITATION_REMINDER },
      { name: QueueName.EMAIL_NOTIFICATION },
    ),
  ],
  providers: [QueueManagerService, MemoriesAiProcessor, AuthGuard],
  controllers: [QueueController],
  exports: [BullModule, QueueManagerService],
})
export class QueueModule {}
