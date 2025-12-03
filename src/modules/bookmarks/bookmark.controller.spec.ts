import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from 'src/guards/auth.guard';
import { ExecutionContext, CanActivate } from '@nestjs/common';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import * as SYM from 'src/shared/constants/systemMessages';

// Mock AuthGuard to automatically provide a user
class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'user-id-123' };
    return true;
  }
}

// Mock BookmarkService methods
const mockBookmarkService = {
  createBookmark: jest.fn((dto, userId) => ({
    text: dto.text,
    verse: dto.verse,
    createdAt: new Date().toISOString(),
  })),
  GetBookmarks: jest.fn(() => [
    { id: 'uuid-1', text: 'In the beginning…', verse: 'Genesis 1:1', createdAt: new Date().toISOString() },
    { id: 'uuid-2', text: 'For God so loved the world…', verse: 'John 3:16', createdAt: new Date().toISOString() },
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
      .useClass(MockAuthGuard)
      .compile();

    controller = module.get<BookmarkController>(BookmarkController);
  });

  it('should create a bookmark successfully', async () => {
    const dto = { text: 'Test text', verse: 'John 3:16' };
    const result = await controller.createBookmark(dto, { user: { id: 'user-id-123' } });

    expect(result.statusCode).toBe(201);
    expect(result.message).toBe(SYM.BOOKMARK_CREATED);
    expect(result.data.bookmark).toHaveProperty('text', 'Test text');
    expect(result.data.bookmark).toHaveProperty('verse', 'John 3:16');
    expect(result.data).toHaveProperty('timestamp');
  });

  it('should fetch bookmarks successfully', async () => {
    const result = await controller.getBookmark({ user: { id: 'user-id-123' } });

    expect(result.statusCode).toBe(200);
    expect(result.message).toBe(SYM.BOOKMARK_FETCHED);
    expect(result.data.bookmarks.length).toBe(2);
  });

  it('should delete a bookmark successfully', async () => {
    const result = await controller.deleteBookmark('uuid-1');

    expect(result.statusCode).toBe(200);
    expect(result.message).toBe(SYM.DELETE_BOOKMARK);
    expect(mockBookmarkService.deleteBookmarks).toHaveBeenCalledWith('uuid-1');
  });
});
