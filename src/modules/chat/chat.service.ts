import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatConversation,
  ChatConversationDocument,
} from '../../schemas/chat-conversation.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageSender } from '../../schemas/chat-message.schema';
import { GeminiService } from './services/gemini.service';
import { ChatContextService } from './services/chat-context.service';
import Redis from 'ioredis';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatConversation.name)
    private chatConversationModel: Model<ChatConversationDocument>,
    private geminiService: GeminiService,
    private chatContextService: ChatContextService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async createConversation(userId: string, title?: string) {
    const conversation = new this.chatConversationModel({
      userId,
      title: title || 'New Conversation',
      messages: [],
      isActive: true,
    });
    return await conversation.save();
  }

  async sendMessage(userId: string, createMessageDto: CreateMessageDto) {
    // 1. Rate Limiting (Simple implementation)
    const rateLimitKey = `chat_limit:${userId}`;
    const currentUsage = await this.redis.incr(rateLimitKey);
    if (currentUsage === 1) {
      await this.redis.expire(rateLimitKey, 60); // 1 minute window
    }
    if (currentUsage > 20) {
      // 20 messages per minute
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Find or create a conversation for this user
    let conversation = await this.chatConversationModel
      .findOne({
        userId,
        isActive: true,
      })
      .sort({ createdAt: -1 });

    if (!conversation) {
      conversation = await this.createConversation(userId);
    }

    // Add user message
    conversation.messages.push({
      sender: MessageSender.USER,
      content: createMessageDto.content,
      timestamp: new Date(),
      references: [], // User messages don't typically have references initially
    });

    // Check if user message contains scripture reference
    const scriptureReferences = this.extractScriptureReferences(
      createMessageDto.content,
    );

    // For now, just save the message and return it
    await conversation.save();

    // 2. Build Context
    const systemPrompt = await this.chatContextService.buildContext(
      userId,
      conversation.id,
      createMessageDto.content,
    );

    // 3. Generate AI Response
    // We pass the system prompt as "context" to the Gemini service
    let aiResponseContent: string;
    try {
      aiResponseContent = await this.geminiService.generateContent(
        createMessageDto.content,
        systemPrompt,
      );
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Use fallback response instead of empty string
      aiResponseContent = this.generateBasicFallbackResponse(
        createMessageDto.content,
        scriptureReferences,
      );
    }

    // Double check that AI response content is not empty
    if (!aiResponseContent || aiResponseContent.trim() === '') {
      aiResponseContent = this.generateBasicFallbackResponse(
        createMessageDto.content,
        scriptureReferences,
      );
    }

    // Extract any new references from AI response
    const aiResponseReferences =
      this.extractScriptureReferences(aiResponseContent);

    // Add AI response to conversation
    conversation.messages.push({
      sender: MessageSender.AI,
      content: aiResponseContent,
      timestamp: new Date(),
      references: [
        ...new Set([...scriptureReferences, ...aiResponseReferences]),
      ], // Combine and deduplicate references
    });

    await conversation.save();

    return {
      userMessage: conversation.messages[conversation.messages.length - 2],
      aiResponse: conversation.messages[conversation.messages.length - 1],
    };
  }

  private extractScriptureReferences(content: string): string[] {
    // Simple regex to find Bible verse references
    // This could be made more sophisticated
    const regex =
      /((?:[1-3]\s)?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+):(\d+(?:-\d+)?)/g;
    const matches: string[] = []; // Properly type the array
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Properly access match array elements with type checking
      if (match[1] && match[2] && match[3]) {
        matches.push(`${match[1]} ${match[2]}:${match[3]}`);
      }
    }

    return matches;
  }

  private async generateAIResponse(
    userMessage: string,
    references: string[],
    conversation?: ChatConversationDocument,
  ): Promise<string> {
    try {
      let response: string;

      // If we have conversation history, pass it as context to Gemini for better responses
      if (conversation && conversation.messages.length > 1) {
        // More than just the current user message
        // Format conversation history for Gemini
        const history = conversation.messages.slice(0, -1).map((msg) => ({
          role: msg.sender === MessageSender.USER ? 'user' : 'model', // Gemini uses 'model' for AI responses
          parts: [{ text: msg.content }],
        }));

        response = await this.geminiService.generateBibleSpecificContent(
          userMessage,
          references,
        );
      } else {
        response = await this.geminiService.generateBibleSpecificContent(
          userMessage,
          references,
        );
      }

      // Ensure response is not empty
      if (!response || response.trim() === '') {
        console.warn('Gemini returned empty response, using fallback');
        return this.generateBasicFallbackResponse(userMessage, references);
      }

      return response;
    } catch (error) {
      // Check if it's a quota limit error
      const errorMessage = error.message || error.toString();
      if (
        errorMessage.includes('quota') ||
        errorMessage.includes('429') ||
        errorMessage.includes('billing') ||
        errorMessage.includes('usage')
      ) {
        console.error('Gemini API quota limit reached:', error);
      } else {
        console.error('Error generating AI response:', error);
      }

      // Return fallback response when API fails
      return this.generateBasicFallbackResponse(userMessage, references);
    }
  }

  private generateBasicFallbackResponse(
    userMessage: string,
    references: string[],
  ): string {
    // Basic fallback response if AI service fails
    let content = '';
    const allReferences = [...references];

    // If there are scripture references in user message, acknowledge them
    if (references.length > 0) {
      content = `I noticed you mentioned ${references.join(' and ')}. `;
      content +=
        "I'm working on providing the full text of these verses soon. ";
    } else {
      // For anxiety-related messages, mention Philippians 4:6 as a helpful reference
      if (
        userMessage.toLowerCase().includes('anxiety') ||
        userMessage.toLowerCase().includes('anxious') ||
        userMessage.toLowerCase().includes('worry') ||
        userMessage.toLowerCase().includes('fear')
      ) {
        content = "It sounds like you're facing a challenging time. ";
        content +=
          "Philippians 4:6-7 says: 'Do not be anxious about anything, ";
        content +=
          'but in every situation, by prayer and petition, with thanksgiving, ';
        content += 'present your requests to God. And the peace of God, ';
        content +=
          "which transcends all understanding, will guard your hearts and your minds in Christ Jesus.' ";
        allReferences.push('Philippians 4:6-7');
      } else {
        // Simple response when no specific references are detected
        content = "Hello! I'm Rea, your Bible-focused AI companion. ";
        content += 'I can help you explore Bible verses and topics. ';
        content += 'What would you like to learn about today?';
      }
    }

    // Ensure content is never empty
    if (!content || content.trim() === '') {
      content =
        "Thank you for sharing. I'm here to help you explore Bible-related questions and topics.";
    }

    return content;
  }

  async getConversations(userId: string) {
    const conversations = await this.chatConversationModel
      .find({ userId })
      .sort({ createdAt: -1 });

    // Transform MongoDB documents to use 'id' instead of '_id'
    return conversations.map((conversation) => {
      const { _id, ...rest } = conversation.toObject();
      return { id: _id.toString(), ...rest };
    });
  }

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await this.chatConversationModel.findOne({
      _id: conversationId,
      userId,
    });

    if (!conversation) {
      return null;
    }

    const { _id, ...rest } = conversation.toObject();
    return { id: _id.toString(), ...rest };
  }
}
