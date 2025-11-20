import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { EmailModule } from './modules/email';
import { SwaggerSyncModule } from 'nestjs-swagger-sync';
import { BibleModule } from './modules/bible/bible.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URI'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    SwaggerSyncModule.register({
      apiKey: process.env.POSTMAN_API_KEY || '',
      swaggerPath: `${process.env.API_VERSION || 'api/v1'}/docs`,
      baseUrl: `http://localhost:${process.env.PORT || 3000}`,
      collectionName: 'REA Interactive Bible API',
      runTest: true,
      ignorePathWithBearerToken: ['api/v1/auth/login', 'api/v1/auth/register'],
    }),

    HealthModule,
    WaitlistModule,
    EmailModule,
    UserModule,
    BibleModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
