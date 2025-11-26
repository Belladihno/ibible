import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from 'src/guards/auth.guard';
import { ExecutionContext, CanActivate } from '@nestjs/common';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';

// Mock AuthGuard
class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'user-id-123' }; // fake logged-in user
    return true;
  }
}

// Mock BookmarkService
const mockBookmarkService = {
  createBookmark: jest.fn((dto, userId) => ({
    book: dto.book,
    chapter: dto.chapter,
    verse: dto.verse,
    createdAt: new Date().toISOString(),
  })),
  GetBookmarks: jest.fn(() => [
    {
      id: 'uuid-1',
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'uuid-2',
      book: 'Exodus',
      chapter: 2,
      verse: 3,
      createdAt: new Date().toISOString(),
    },
  ]),
  deleteBookmarks: jest.fn(),
};

describe('BookmarkController', () => {
  let controller: BookmarkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarkController],
      providers: [{ provide: BookmarkService, useValue: mockBookmarkService }],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard) // Use the mock guard
      .compile();

    controller = module.get<BookmarkController>(BookmarkController);
  });

  it('should create a bookmark successfully', async () => {
    const dto = { book: 'Genesis', chapter: 1, verse: 1 };
    const result = await controller.createBookmark(dto, {
      user: { id: 'user-id-123' },
    });
    expect(result).toHaveProperty('statusCode', 201);
    expect(result).toHaveProperty('message', 'Bookmark created successfully');
    expect(result.data).toHaveProperty('book', 'Genesis');
  });

  it('should get bookmarks successfully', async () => {
    const result = await controller.getBookmark({
      user: { id: 'user-id-123' },
    });
    expect(result).toHaveProperty('statusCode', 200);
    expect(result.data).toHaveLength(2);
  });

  it('should delete a bookmark successfully', async () => {
    const result = await controller.deleteBookmark('uuid-1');
    expect(result).toHaveProperty('statusCode', 200);
    expect(result).toHaveProperty('message', 'Bookmark deleted successfully');
  });
});
