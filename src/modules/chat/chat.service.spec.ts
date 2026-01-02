import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { ChatService } from './chat.service';
import {
  ChatConversation,
  ChatConversationDocument,
} from '../../schemas/chat-conversation.schema';
import { GeminiService } from '../gemini/gemini.service';
import { ChatContextService } from './services/chat-context.service';

describe('ChatService', () => {
  let service: ChatService;
  let model: Model<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(ChatConversation.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            countDocuments: jest.fn(),
            save: jest.fn(),
          },
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
    model = module.get<Model<any>>(getModelToken(ChatConversation.name));
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
      // Re-get service with mocked redis
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ChatService,
          {
            provide: getModelToken(ChatConversation.name),
            useValue: class MockModel {
              constructor(data: any) {
                Object.assign(this, data);
                this.save = jest.fn().mockResolvedValue(this);
              }
              save: jest.MockedFunction<any>;
              static find = jest.fn();
              static findOne = jest.fn();
              static countDocuments = jest.fn();
            },
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
      jest.spyOn(model, 'findOne').mockResolvedValue(null);

      await expect(
        service.sendMessage('user1', {
          content: 'test',
          conversationId: '6584f2e5c5e123456789abcd',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create conversation when none exists', async () => {
      redisMock.incr.mockResolvedValueOnce(1); // Daily ok
      redisMock.incr.mockResolvedValueOnce(1); // Per-minute ok

      jest.spyOn(model, 'findOne').mockResolvedValue(null);
      const mockConversation = {
        _id: 'conv1',
        userId: 'user1',
        title: 'Test',
        messages: [],
        isActive: true,
        save: jest.fn().mockResolvedValue({}),
      } as unknown as ChatConversationDocument;
      const createConversationSpy = jest.spyOn(service, 'createConversation');
      createConversationSpy.mockResolvedValue(mockConversation);

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

      jest.spyOn(model, 'findOne').mockResolvedValue(null);
      const mockConversation = {
        _id: 'conv1',
        userId: 'user1',
        title: 'Test',
        messages: [],
        isActive: true,
        save: jest.fn().mockResolvedValue({}),
      } as unknown as ChatConversationDocument;
      jest
        .spyOn(service, 'createConversation')
        .mockResolvedValue(mockConversation);

      const result = await service.sendMessage('user1', { content: 'test' });
      expect(result).toBeDefined();
    });
  });
});
