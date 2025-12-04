import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookMarks } from 'src/entities/bookmark.entity';
import { User } from 'src/entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import * as SYM from 'src/shared/constants/systemMessages';

describe('BookmarkService', () => {
  let service: BookmarkService;
  let bookMarkRepo: Repository<BookMarks>;
  let userRepo: Repository<User>;

  const mockBookMarkRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarkService,
        { provide: getRepositoryToken(BookMarks), useValue: mockBookMarkRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<BookmarkService>(BookmarkService);
    bookMarkRepo = module.get(getRepositoryToken(BookMarks));
    userRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // CREATE BOOKMARK
  describe('createBookmark', () => {
    it('should throw BadRequestException if createDto is empty', async () => {
      await expect(
        service.createBookmark(null as any, 'user-id'),
      ).rejects.toThrow(new BadRequestException(SYM.PAYLOAD_CANNOT_BE_EMPTY));
    });

    it('should throw BadRequestException if text or verse is missing', async () => {
      const dto = { text: '', verse: '' } as any;

      await expect(service.createBookmark(dto, 'user-id')).rejects.toThrow(
        new BadRequestException(SYM.BOOK_CHAPTER_VERSE_REQUIRED),
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      const dto: CreateBookmarkDto = { text: 'sample', verse: 'John 3:16' };

      await expect(service.createBookmark(dto, 'user-id')).rejects.toThrow(
        new BadRequestException(SYM.USER_NOT_FOUND),
      );
    });

    it('should throw Error if bookmark already exists', async () => {
      const user = { id: 'user-id' };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockBookMarkRepo.findOne.mockResolvedValue({ id: 'b1' });

      const dto: CreateBookmarkDto = { text: 'sample', verse: 'John 3:16' };
      await expect(service.createBookmark(dto, 'user-id')).rejects.toThrow(
        SYM.VERSE_ALREADY_BOOKMARKED,
      );
    });

    it('should create and return a bookmark', async () => {
      const user = { id: 'user-id' };
      const dto: CreateBookmarkDto = { text: 'sample', verse: 'John 3:16' };
      const createdBookmark = {
        id: 'bookmark-id',
        text: dto.text,
        verse: dto.verse,
        createdAt: new Date(),
        user,
      };

      mockUserRepo.findOne.mockResolvedValue(user);
      mockBookMarkRepo.findOne.mockResolvedValue(null);
      mockBookMarkRepo.create.mockReturnValue(createdBookmark);
      mockBookMarkRepo.save.mockResolvedValue(createdBookmark);

      const result = await service.createBookmark(dto, 'user-id');
      expect(result.text).toBe(dto.text);
      expect(result.verse).toBe(dto.verse);
      expect(result.createdAt).toBeDefined();
    });
  });

  // GET BOOKMARKS
  describe('GetBookmarks', () => {
    it('should throw BadRequestException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.GetBookmarks('user-id')).rejects.toThrow(
        new BadRequestException(SYM.USER_NOT_FOUND),
      );
    });

    it('should return array of bookmarks', async () => {
      const user = { id: 'user-id' };
      const bookmarks = [
        {
          id: '1',
          text: 'Fear not',
          verse: 'Isaiah 41:10',
          createdAt: new Date(),
        },
        {
          id: '2',
          text: 'Love is patient',
          verse: '1 Corinthians 13:4',
          createdAt: new Date(),
        },
      ];

      mockUserRepo.findOne.mockResolvedValue(user);
      mockBookMarkRepo.find.mockResolvedValue(bookmarks);

      const result = await service.GetBookmarks('user-id');
      expect(result.length).toBe(2);
      expect(result[0].text).toBe('Fear not');
      expect(result[1].verse).toBe('1 Corinthians 13:4');
    });
  });

  // DELETE BOOKMARK
  describe('deleteBookmarks', () => {
    it('should throw BadRequestException if bookmark not found', async () => {
      mockBookMarkRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteBookmarks('bookmark-id')).rejects.toThrow(
        new BadRequestException(SYM.BOOKMARK_NOT_FOUND),
      );
    });

    it('should delete bookmark successfully', async () => {
      const bookmark = { id: 'bookmark-id' };
      mockBookMarkRepo.findOne.mockResolvedValue(bookmark);
      mockBookMarkRepo.delete.mockResolvedValue({});

      await expect(
        service.deleteBookmarks('bookmark-id'),
      ).resolves.toBeUndefined();
      expect(mockBookMarkRepo.delete).toHaveBeenCalledWith('bookmark-id');
    });
  });
});
