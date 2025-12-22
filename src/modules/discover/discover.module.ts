import { Module } from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { DiscoverController } from './discover.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEmotion } from 'src/entities/user-emotions.entity';
import { User } from 'src/entities/user.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import { JwtModule } from '@nestjs/jwt';
import appConfig from 'src/config/auth.config';
import { RedisService } from '../redis/redis.service';
import { BibleModule } from '../bible/bible.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEmotion, User]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
    BibleModule,
    GeminiModule, // ✅ imports GeminiModule which exports GeminiService
  ],
  controllers: [DiscoverController],
  providers: [DiscoverService, AuthGuard, RedisService],
})
export class DiscoverModule {}
