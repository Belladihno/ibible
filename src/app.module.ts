import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { BibleVerseModule } from './modules/bible/bible-verse/bible-verse.module';
import dataSource from './migrations/migration.config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...dataSource.options,
        autoLoadEntities: true,
      }),
      dataSourceFactory: async () => dataSource,
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
      ignorePathWithBearerToken: ['api/v1/user/login', 'api/v1/user/signup'],
    }),
    HealthModule,
    WaitlistModule,
    EmailModule,
    UserModule,
    BibleModule,
    NotificationsModule,
    BibleVerseModule,
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
