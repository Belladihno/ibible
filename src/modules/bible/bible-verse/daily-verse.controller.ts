// import { Controller, Get, HttpStatus, HttpCode, Post, UseGuards, Req, Param, Body } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
// import { AuthGuard } from '@nestjs/passport';
// import type { Request } from 'express';

// import { DailyVerseResponse, DailyVerseSummaryResponse } from 'src/shared/types/bible-verse.types';
// import { BibleVerseService } from './daily-verse.service';
// import { PostMessageDto } from './dto/post-message.dto';

// @ApiTags('Bible Verse')
// @Controller('bible-verse')
// export class BibleVerseController {
//   constructor(private readonly bibleVerseService: BibleVerseService) {}

//   @Get('daily')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({
//     summary: 'Get daily Bible verse',
//     description:
//       'Retrieves the current daily Bible verse. The verse is automatically refreshed every 24 hours at midnight and remains available throughout the day. Each verse includes the reference, text, book details, and translation information.',
//   })
//   @ApiResponse({
//     status: HttpStatus.OK,
//     description: 'Daily Bible verse retrieved successfully',
//     schema: {
//       example: {
//         success: true,
//         data: {
//           reference: 'John 3:16',
//           book: 'John',
//           chapter: 3,
//           verse: 16,
//           text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
//           translation: {
//             identifier: 'web',
//             name: 'World English Bible',
//             language: 'English',
//             language_code: 'eng',
//             license: 'Public Domain',
//           },
//           // The AI summary should be an engaging brief explanation (not a repetition),
//           // possibly followed by a question to invite the user to continue the conversation.
//           summary: 'This verse highlights God\'s sacrificial love and the promise of eternal life to those who trust in Christ. How does this truth change the way you think about love and sacrifice today?',
//         },
//       },
//     },
//   })
//   @ApiResponse({
//     status: HttpStatus.SERVICE_UNAVAILABLE,
//     description: 'Bible API service is unavailable',
//     schema: {
//       example: {
//         success: false,
//         message: 'External Bible API is currently unavailable',
//         statusCode: HttpStatus.SERVICE_UNAVAILABLE,
//         error: 'Service Unavailable',
//       },
//     },
//   })
//   async getDailyVerse(): Promise<DailyVerseSummaryResponse> {
//     // Keep controller minimal: delegate to service for summary logic
//     return await this.bibleVerseService.getDailyVerseWithSummary();
//   }

//   @Post('daily/start-conversation')
//   @UseGuards(AuthGuard('jwt'))
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Start a bible-verse conversation seeded with daily verse summary' })
//   @ApiResponse({
//     status: HttpStatus.CREATED,
//     description: 'Conversation created and AI starter message saved',
//     schema: {
//       example: {
//         conversation: {
//           id: 'uuid-1234',
//           userId: 'uuid-user',
//           verseReference: 'John 3:16',
//           isActive: true,
//           createdAt: '2025-12-02T00:00:00.000Z'
//         },
//         aiMessage: {
//           id: 'uuid-msg-1',
//           sender: 'assistant',
//           content: "This verse highlights God's sacrificial love and the promise of eternal life to those who trust in Christ. How does this truth change the way you think about love and sacrifice today?",
//           createdAt: '2025-12-02T00:00:01.000Z'
//         }
//       }
//     }
//   })
//   async startConversation(@Req() req: Request) {
//     const payload = req.user as { userId?: string; sub?: string; id?: string } & Record<string, unknown>;
//     const userId = payload.userId ?? payload.sub ?? payload.id;
//     return await this.bibleVerseService.startConversationForUser(userId as string);
//   }

//   @Post('daily/conversations/:id/message')
//   @UseGuards(AuthGuard('jwt'))
//   @ApiBearerAuth()
//   @ApiParam({
//     name: 'id',
//     description: 'conversationId',
//     type: 'string',
//     required: true,
//     example: '5ac80588-3ce6-4c5c-bb75-f6a12c0fe311'
//   })
//   @ApiBody({
//     description: 'Request body for posting a user message to a daily verse conversation',
//     schema: {
//       type: 'object',
//       properties: {
//         content: {
//           type: 'string',
//           example: 'I would have to spend more time with the scriptures',
//         },
//       },
//       required: ['content'],
//     },
//   })
//   @ApiOperation({ summary: 'Post a message to a daily-verse conversation and get AI reply' })
//   @ApiResponse({
//     status: HttpStatus.CREATED,
//     description: 'User message saved and AI reply returned',
//     schema: {
//       example: {
//         conversation: {
//           id: '540d7580-3888-4b86-a3d0-d5048c732d25',
//           userId: '85162c5d-d5b0-4b2d-8803-137f5abec709',
//           verseReference: 'Deuteronomy 30:12',
//           messages: [],
//           isActive: true,
//           createdAt: '2025-12-03T19:05:31.322Z',
//           updatedAt: '2025-12-03T19:05:31.322Z'
//         },
//         aiMessage: {
//           id: 'f413011e-09ba-41c5-80b1-5f53cc66a9c4',
//           conversation: {
//             id: '540d7580-3888-4b86-a3d0-d5048c732d25',
//             userId: '85162c5d-d5b0-4b2d-8803-137f5abec709',
//             verseReference: 'Deuteronomy 30:12',
//             messages: [],
//             isActive: true,
//             createdAt: '2025-12-03T19:05:31.322Z',
//             updatedAt: '2025-12-03T19:05:31.322Z'
//           },
//           sender: 'assistant',
//           content: "This passage invites thoughtful reflection on its meaning and practical effect. Consider how the truth behind Deuteronomy 30:12 might shape a choice or change in your daily life.\n\nWhat is one small step you could take this week in response to this passage?",
//           createdAt: '2025-12-03T19:05:31.402Z'
//         },
//         timestamp: '2025-12-03T20:05:31.466Z'
//       }
//     }
//   })
//   async postMessage(
//     @Param('id') id: string,
//     @Req() req: Request,
//     @Body() dto: PostMessageDto,
//   ) {
//     const payload = req.user as { userId?: string; sub?: string; id?: string } & Record<string, unknown>;
//     const userId = payload.userId ?? payload.sub ?? payload.id;
//     return await this.bibleVerseService.postMessageToConversation(id, userId as string, dto.content);
//   }

//   @Get('daily/conversations/:id')
//   @UseGuards(AuthGuard('jwt'))
//   @ApiBearerAuth()
//   @ApiParam({ name: 'id', description: 'conversationId', type: 'string', required: true, example: '5ac80588-3ce6-4c5c-bb75-f6a12c0fe311' })
//   @ApiOperation({ summary: 'Get a daily-verse conversation history by id' })
//   @ApiResponse({ status: HttpStatus.OK, description: 'Conversation retrieved successfully' })
//   async getConversation(
//     @Param('id') id: string,
//     @Req() req: Request,
//   ) {
//     const payload = req.user as { userId?: string; sub?: string; id?: string } & Record<string, unknown>;
//     const userId = payload.userId ?? payload.sub ?? payload.id;
//     return await this.bibleVerseService.getConversationHistory(id, userId as string);
//   }

//   @Get('daily/conversations-history')
//   @UseGuards(AuthGuard('jwt'))
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'List daily-verse conversations for the authenticated user' })
//   @ApiResponse({ status: HttpStatus.OK, description: 'List of conversations retrieved successfully' })
//   async listConversations(@Req() req: Request) {
//     const payload = req.user as { userId?: string; sub?: string; id?: string } & Record<string, unknown>;
//     const userId = payload.userId ?? payload.sub ?? payload.id;
//     return await this.bibleVerseService.listConversationsForUser(userId as string);
//   }
// }




import { 
  Controller, 
  Get, 
  HttpStatus, 
  HttpCode, 
  Post, 
  UseGuards, 
  Req, 
  Param, 
  Body 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiBody, 
  ApiParam 
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import { DailyVerseSummaryResponse } from 'src/shared/types/bible-verse.types';
import { BibleVerseService } from './daily-verse.service';
import type {
  StartConversationResponse,
  ConversationHistoryResponse,
  ConversationSummary,
  PostMessageResponse,
} from './daily-verse.service';
import { PostMessageDto } from './dto/post-message.dto';

interface AuthenticatedUser {
  userId?: string;
  sub?: string;
  id?: string;
}

@ApiTags('Bible Verse')
@Controller('bible-verse')
export class BibleVerseController {
  constructor(private readonly bibleVerseService: BibleVerseService) {}

  @Get('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get daily Bible verse with AI-generated summary',
    description:
      'Retrieves the current daily Bible verse with an AI-generated conversational summary. The verse is automatically refreshed every 24 hours at midnight and remains available throughout the day. Each verse includes the reference, text, book details, translation information, and an engaging AI summary with a reflection question.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Daily Bible verse with summary retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          verse: {
            reference: 'John 3:16',
            book: 'John',
            chapter: 3,
            verse: 16,
            text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
            translation: {
              identifier: 'web',
              name: 'World English Bible',
              language: 'English',
              language_code: 'eng',
              license: 'Public Domain',
            },
          },
          summary: 'This verse highlights God\'s sacrificial love and the promise of eternal life to those who trust in Christ. How does this truth change the way you think about love and sacrifice today?',
          verseId: 'verse-id-123',
          timestamp: '2025-12-03T20:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Bible API service is unavailable',
    schema: {
      example: {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'External Bible API is currently unavailable',
        error: 'Service Unavailable',
      },
    },
  })
  async getDailyVerse(): Promise<DailyVerseSummaryResponse> {
    return await this.bibleVerseService.getDailyVerseWithSummary();
  }

  @Post('daily/start-conversation')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Start a daily verse conversation', 
    description: 'Creates a new conversation seeded with the daily verse and an AI-generated introduction. The AI message provides context and asks an engaging question to start the discussion.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Conversation created successfully with AI starter message',
    schema: {
      example: {
        conversation: {
          id: 'uuid-1234',
          userId: 'uuid-user',
          verseReference: 'John 3:16',
          isActive: true,
          createdAt: '2025-12-02T00:00:00.000Z',
          updatedAt: '2025-12-02T00:00:00.000Z'
        },
        aiMessage: {
          id: 'uuid-msg-1',
          conversation: {
            id: 'uuid-1234',
            userId: 'uuid-user',
            title: 'Daily Verse: John 3:16',
            verseReference: 'John 3:16',
            messages: [],
            isActive: true,
            createdAt: '2025-12-02T00:00:00.000Z',
            updatedAt: '2025-12-02T00:00:00.000Z'
          },
          sender: 'assistant',
          content: "This verse highlights God's sacrificial love and the promise of eternal life to those who trust in Christ. How does this truth change the way you think about love and sacrifice today?",
          createdAt: '2025-12-02T00:00:01.000Z',
          updatedAt: '2025-12-02T00:00:01.000Z'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User ID is required but not provided',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async startConversation(@Req() req: Request): Promise<StartConversationResponse> {
    const user = req.user as AuthenticatedUser;
    const userId = user.userId ?? user.sub ?? user.id;
    
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    
    return await this.bibleVerseService.startConversationForUser(userId);
  }

  @Post('daily/conversations/:id/message')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    type: 'string',
    required: true,
    example: '5ac80588-3ce6-4c5c-bb75-f6a12c0fe311'
  })
  @ApiBody({
    description: 'User message to post to the conversation',
    type: PostMessageDto,
    examples: {
      example1: {
        summary: 'Reflection response',
        value: {
          content: 'I would have to spend more time with the scriptures',
        }
      },
      example2: {
        summary: 'Question',
        value: {
          content: 'Can you explain this verse in simpler terms?',
        }
      }
    }
  })
  @ApiOperation({ 
    summary: 'Post a message to a conversation', 
    description: 'Sends a user message to an existing daily verse conversation and receives an AI-generated reply. The conversation history is maintained and returned with organized message pairs.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message posted successfully and AI reply generated',
    schema: {
      example: {
        conversation: {
          id: '540d7580-3888-4b86-a3d0-d5048c732d25',
          userId: '85162c5d-d5b0-4b2d-8803-137f5abec709',
          verseReference: 'Deuteronomy 30:12',
          isActive: true,
          createdAt: '2025-12-03T19:05:31.322Z',
          updatedAt: '2025-12-03T19:05:31.322Z'
        },
        messagePairs: [
          {
            user: null,
            assistant: {
              id: 'msg-1',
              content: 'Welcome message from AI...',
              createdAt: '2025-12-03T19:05:31.402Z'
            }
          },
          {
            user: {
              id: 'msg-2',
              content: 'I would have to spend more time with the scriptures',
              createdAt: '2025-12-03T19:06:00.000Z'
            },
            assistant: {
              id: 'msg-3',
              content: "That's a wonderful commitment! Spending time in Scripture is one of the most transformative practices we can develop...",
              createdAt: '2025-12-03T19:06:01.000Z'
            }
          }
        ]
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Conversation not found or user not authorized',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async postMessage(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: PostMessageDto,
  ): Promise<PostMessageResponse> {
    const user = req.user as AuthenticatedUser;
    const userId = user.userId ?? user.sub ?? user.id;
    
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    
    return await this.bibleVerseService.postMessageToConversation(id, userId, dto.content);
  }

  @Get('daily/conversations/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiParam({ 
    name: 'id', 
    description: 'Conversation ID', 
    type: 'string', 
    required: true, 
    example: '5ac80588-3ce6-4c5c-bb75-f6a12c0fe311' 
  })
  @ApiOperation({ 
    summary: 'Get conversation history', 
    description: 'Retrieves the complete message history for a specific daily verse conversation, organized as user-assistant message pairs.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Conversation history retrieved successfully',
    schema: {
      example: {
        conversation: {
          id: '5ac80588-3ce6-4c5c-bb75-f6a12c0fe311',
          userId: '85162c5d-d5b0-4b2d-8803-137f5abec709',
          verseReference: 'John 3:16',
          isActive: true,
          createdAt: '2025-12-03T19:05:31.322Z',
          updatedAt: '2025-12-03T19:05:31.322Z'
        },
        messagePairs: [
          {
            user: null,
            assistant: {
              id: 'msg-1',
              content: 'AI introduction message...',
              createdAt: '2025-12-03T19:05:31.402Z'
            }
          },
          {
            user: {
              id: 'msg-2',
              content: 'User message...',
              createdAt: '2025-12-03T19:06:00.000Z'
            },
            assistant: {
              id: 'msg-3',
              content: 'AI reply...',
              createdAt: '2025-12-03T19:06:01.000Z'
            }
          }
        ]
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Conversation not found or user not authorized',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async getConversation(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ConversationHistoryResponse> {
    const user = req.user as AuthenticatedUser;
    const userId = user.userId ?? user.sub ?? user.id;
    
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    
    return await this.bibleVerseService.getConversationHistory(id, userId);
  }

  @Get('daily/conversations-history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'List user conversations', 
    description: 'Retrieves all daily verse conversations for the authenticated user, ordered by most recent activity. Each conversation includes metadata and the last message pair.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Conversation list retrieved successfully',
    schema: {
      example: [
        {
          id: 'conv-1',
          verseReference: 'John 3:16',
          isActive: true,
          createdAt: '2025-12-03T19:05:31.322Z',
          updatedAt: '2025-12-03T19:10:00.000Z',
          messagePairs: [
            {
              user: null,
              assistant: {
                id: 'msg-1',
                content: 'AI introduction...',
                createdAt: '2025-12-03T19:05:31.402Z'
              }
            },
            {
              user: {
                id: 'msg-2',
                content: 'User message...',
                createdAt: '2025-12-03T19:06:00.000Z'
              },
              assistant: {
                id: 'msg-3',
                content: 'AI reply...',
                createdAt: '2025-12-03T19:06:01.000Z'
              }
            }
          ],
          lastPair: {
            user: {
              id: 'msg-2',
              content: 'User message...',
              createdAt: '2025-12-03T19:06:00.000Z'
            },
            assistant: {
              id: 'msg-3',
              content: 'AI reply...',
              createdAt: '2025-12-03T19:06:01.000Z'
            }
          }
        }
      ]
    }
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async listConversations(@Req() req: Request): Promise<ConversationSummary[]> {
    const user = req.user as AuthenticatedUser;
    const userId = user.userId ?? user.sub ?? user.id;
    
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    
    return await this.bibleVerseService.listConversationsForUser(userId);
  }
}