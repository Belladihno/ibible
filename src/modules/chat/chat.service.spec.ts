import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { ChatService } from './chat.service';
import { ChatConversation } from '../../schemas/chat-conversation.schema';
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
    it('should throw NotFoundException if conversation not found', async () => {
      // Use spyOn to fix unbound-method error
      jest.spyOn(model, 'findOne').mockResolvedValue(null);

      await expect(
        service.sendMessage('user1', {
          content: 'test',
          conversationId: '6584f2e5c5e123456789abcd',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
