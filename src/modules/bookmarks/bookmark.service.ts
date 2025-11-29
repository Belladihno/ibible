import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BookMarks } from 'src/entities/bookmark.entity';
import { User } from 'src/entities/user.entity';
import { Bookmark } from 'src/shared/interfaces/bookmark.interface';
import { Repository } from 'typeorm';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import * as SYM from 'src/shared/constants/systemMessages';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(BookMarks)
    private readonly bookMarkRepo: Repository<BookMarks>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createBookmark(
    createDto: CreateBookmarkDto,
    userId: string,
  ): Promise<Bookmark> {
    if (!createDto) {
      throw new BadRequestException(SYM.PAYLOAD_CANNOT_BE_EMPTY);
    }

    const { text, verse } = createDto;

    if (!text || !verse) {
      throw new BadRequestException(SYM.BOOK_CHAPTER_VERSE_REQUIRED);
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(SYM.USER_NOT_FOUND);
    }

    const bookmarkExist = await this.bookMarkRepo.findOne({
      where: { ...createDto, user: { id: userId } },
      relations: ['user'],
    });

    if (bookmarkExist) {
      throw new Error(SYM.VERSE_ALREADY_BOOKMARKED);
    }

    const bookmark = this.bookMarkRepo.create({
      text: text,
      verse: verse,
      user: user,
    });

    const saveBookmark = await this.bookMarkRepo.save(bookmark);

    const response: Bookmark = {
      text: text,
      verse: verse,
      createdAt: new Date(),
    };

    return response;
  }

  async GetBookmarks(userId: string): Promise<Bookmark[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException(SYM.USER_NOT_FOUND);
    }

    const bookmarks = await this.bookMarkRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });

    return bookmarks.map((b) => ({
      id: b.id,
      text: b.text,
      verse: b.verse,
      createdAt: b.createdAt,
    }));
  }

  async deleteBookmarks(id: string): Promise<void> {
    const bookmark = await this.bookMarkRepo.findOne({ where: { id } });

    if (!bookmark) {
      throw new BadRequestException(SYM.BOOKMARK_NOT_FOUND);
    }
    await this.bookMarkRepo.delete(id);
  }
}
