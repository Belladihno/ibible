import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookMarks } from 'src/entities/bookmark.entity';
import { User } from 'src/entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

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
    bookMarkRepo = module.get<Repository<BookMarks>>(
      getRepositoryToken(BookMarks),
    );
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBookmark', () => {
    it('should throw BadRequestException if createDto is empty', async () => {
      await expect(
        service.createBookmark(null as any, 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      const dto: CreateBookmarkDto = { book: 'Genesis', chapter: 1, verse: 1 };
      await expect(service.createBookmark(dto, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw Error if bookmark already exists', async () => {
      const user = { id: 'user-id' };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockBookMarkRepo.findOne.mockResolvedValue({ id: 'bookmark-id' });

      const dto: CreateBookmarkDto = { book: 'Genesis', chapter: 1, verse: 1 };
      await expect(service.createBookmark(dto, 'user-id')).rejects.toThrow(
        'Verse already bookmarked',
      );
    });

    it('should create and return a bookmark', async () => {
      const user = { id: 'user-id' };
      const dto: CreateBookmarkDto = { book: 'Genesis', chapter: 1, verse: 1 };
      const createdBookmark = {
        ...dto,
        user,
        id: 'bookmark-id',
        createdAt: new Date(),
      };

      mockUserRepo.findOne.mockResolvedValue(user);
      mockBookMarkRepo.findOne.mockResolvedValue(null);
      mockBookMarkRepo.create.mockReturnValue(createdBookmark);
      mockBookMarkRepo.save.mockResolvedValue(createdBookmark);

      const result = await service.createBookmark(dto, 'user-id');
      expect(result).toEqual(expect.objectContaining(dto));
    });
  });

  describe('GetBookmarks', () => {
    it('should throw BadRequestException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.GetBookmarks('user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return bookmarks array', async () => {
      const user = { id: 'user-id' };
      const bookmarks = [
        {
          id: '1',
          book: 'Genesis',
          chapter: 1,
          verse: 1,
          createdAt: new Date(),
          user,
        },
        {
          id: '2',
          book: 'Exodus',
          chapter: 2,
          verse: 3,
          createdAt: new Date(),
          user,
        },
      ];

      mockUserRepo.findOne.mockResolvedValue(user);
      mockBookMarkRepo.find.mockResolvedValue(bookmarks);

      const result = await service.GetBookmarks('user-id');
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('book', 'Genesis');
    });
  });

  describe('deleteBookmarks', () => {
    it('should throw BadRequestException if bookmark not found', async () => {
      mockBookMarkRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteBookmarks('bookmark-id')).rejects.toThrow(
        BadRequestException,
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
