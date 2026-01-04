import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { ChatService } from './chat.service';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { GeminiService } from '../gemini/gemini.service';
import { ChatContextService } from './services/chat-context.service';

describe('ChatService', () => {
  let service: ChatService;
  let chatConversationRepo: any;
  let chatMessageRepo: any;
  let dataSource: any;
  let queryRunner: any;

  beforeEach(async () => {
    // Mock QueryRunner
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        findOne: jest.fn(),
        create: jest
          .fn()
          .mockImplementation(
            (entity: Partial<ChatConversation>) => entity as ChatConversation,
          ),
      },
    };

    // Mock DataSource
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    // Mock Repositories
    chatConversationRepo = {
      create: jest
        .fn()
        .mockImplementation(
          (dto: Partial<ChatConversation>) => dto as ChatConversation,
        ),
      save: jest.fn().mockImplementation((entity: ChatConversation) => {
        const saved = { ...entity } as ChatConversation;
        if (!saved.id) saved.id = 'saved-id';
        return Promise.resolve(saved);
      }),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getOne: jest.fn(),
      }),
    };

    chatMessageRepo = {
      create: jest
        .fn()
        .mockImplementation((dto: Partial<ChatMessage>) => dto as ChatMessage),
      save: jest.fn().mockImplementation((entity: ChatMessage) => {
        const saved = { ...entity } as ChatMessage;
        if (!saved.id) saved.id = 'msg-id';
        return Promise.resolve(saved);
      }),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatConversation),
          useValue: chatConversationRepo,
        },
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: chatMessageRepo,
        },
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
        },
        { provide: GeminiService, useValue: { generate: jest.fn() } },
        { provide: ChatContextService, useValue: { buildContext: jest.fn() } },
        {
          provide: 'REDIS_CLIENT',
          useValue: { incr: jest.fn(), expire: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    let redisMock: any;

    beforeEach(async () => {
      redisMock = {
        incr: jest.fn(),
        expire: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ChatService,
          {
            provide: getRepositoryToken(ChatConversation),
            useValue: chatConversationRepo,
          },
          {
            provide: getRepositoryToken(ChatMessage),
            useValue: chatMessageRepo,
          },
          {
            provide: getDataSourceToken(),
            useValue: dataSource,
          },
          {
            provide: GeminiService,
            useValue: { generate: jest.fn().mockResolvedValue('AI response') },
          },
          {
            provide: ChatContextService,
            useValue: { buildContext: jest.fn().mockResolvedValue('context') },
          },
          { provide: 'REDIS_CLIENT', useValue: redisMock },
        ],
      }).compile();
      service = module.get(ChatService);
    });

    it('should throw NotFoundException if conversation not found', async () => {
      chatConversationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.sendMessage('user1', {
          content: 'test',
          conversationId: 'non-existent-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create conversation when none exists', async () => {
      redisMock.incr.mockResolvedValueOnce(1); // Daily ok
      redisMock.incr.mockResolvedValueOnce(1); // Per-minute ok

      // Since createConversation calls makeTitleUnique and uses queryBuilder, we need to mock that flow if tested deeply
      // But typically we test if createConversation is called or works.
      // Here we mock the internal createConversation call for simplicity or mock repos deep enough

      const mockConversation = {
        id: 'conv1',
        userId: 'user1',
        title: 'Test',
        isActive: true,
      };

      const createConversationSpy = jest.spyOn(service, 'createConversation');
      createConversationSpy.mockResolvedValue(mockConversation as any);

      const result = await service.sendMessage('user1', { content: 'test' });
      expect(result).toBeDefined();
      expect(createConversationSpy).toHaveBeenCalledWith(
        'user1',
        'test',
        false,
      );
    });

    it('should proceed when within limits', async () => {
      redisMock.incr.mockResolvedValueOnce(1); // Daily ok
      redisMock.incr.mockResolvedValueOnce(1); // Per-minute ok

      const mockConversation = {
        id: 'conv1',
        userId: 'user1',
        title: 'Test',
        isActive: true,
      };
      jest
        .spyOn(service, 'createConversation')
        .mockResolvedValue(mockConversation as any);

      const result = await service.sendMessage('user1', { content: 'test' });
      expect(result).toBeDefined();
    });
  });
});
