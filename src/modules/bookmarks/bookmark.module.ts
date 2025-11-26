import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt'; // <-- import this
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { BookMarks } from 'src/entities/bookmark.entity';
import { User } from 'src/entities/user.entity';
import appConfig from 'src/config/auth.config';
import { AuthGuard } from 'src/guards/auth.guard'; // your guard

@Module({
  imports: [
    TypeOrmModule.forFeature([BookMarks, User]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [BookmarkController],
  providers: [BookmarkService, AuthGuard],
})
export class BookmarkModule {}
