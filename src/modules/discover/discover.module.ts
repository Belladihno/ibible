import { Module } from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { DiscoverController } from './discover.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEmotion } from 'src/entities/user-emotions.entity';
import { GeminiService } from '../chat/services/gemini.service';
import { User } from 'src/entities/user.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import { JwtModule } from '@nestjs/jwt';
import appConfig from 'src/config/auth.config';
import { RedisService } from '../redis/redis.service';
import { BibleModule } from '../bible/bible.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEmotion, User]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
    BibleModule,
  ],
  controllers: [DiscoverController],
  providers: [DiscoverService, GeminiService, AuthGuard, RedisService],
})
export class DiscoverModule {}
