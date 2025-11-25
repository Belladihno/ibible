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

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatConversation.name)
    private chatConversationModel: Model<ChatConversationDocument>,
    private geminiService: GeminiService,
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

    // Generate an AI response using Gemini
    const aiResponseContent = await this.generateAIResponse(
      createMessageDto.content,
      scriptureReferences,
      conversation,
    );

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
    const regex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+):(\d+(?:-\d+)?)/g;
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
      // If we have conversation history, pass it as context to Gemini for better responses
      if (conversation && conversation.messages.length > 1) {
        // More than just the current user message
        // Format conversation history for Gemini
        const history = conversation.messages.slice(0, -1).map((msg) => ({
          role: msg.sender === MessageSender.USER ? 'user' : 'model', // Gemini uses 'model' for AI responses
          parts: [{ text: msg.content }],
        }));

        return await this.geminiService.generateBibleSpecificContent(
          userMessage,
          references,
        );
      } else {
        return await this.geminiService.generateBibleSpecificContent(
          userMessage,
          references,
        );
      }
    } catch (error) {
      // Fallback to a basic response if Gemini fails
      console.error('Error generating AI response:', error);
      return this.generateBasicFallbackResponse(userMessage, references);
    }
  }

  private generateBasicFallbackResponse(
    userMessage: string,
    references: string[],
  ): string {
    // Basic fallback response if AI service fails
    let content = 'Thank you for sharing. ';
    const allReferences = [...references];

    // If there are scripture references in user message, acknowledge them
    if (references.length > 0) {
      content +=
        `I noticed you mentioned ${references.join(' and ')}. ` +
        "When the Bible module is enhanced, I'll be able to provide the full text of these verses. ";
    } else {
      // For anxiety-related messages, mention Philippians 4:6 as a helpful reference
      if (
        userMessage.toLowerCase().includes('anxiety') ||
        userMessage.toLowerCase().includes('worry') ||
        userMessage.toLowerCase().includes('fear')
      ) {
        content +=
          "It sounds like you're facing a challenging time. " +
          "Philippians 4:6-7 says: 'Do not be anxious about anything, " +
          'but in every situation, by prayer and petition, with thanksgiving, ' +
          'present your requests to God. And the peace of God, ' +
          "which transcends all understanding, will guard your hearts and your minds in Christ Jesus.' ";
        allReferences.push('Philippians 4:6-7');
      } else {
        // Simple response when no specific references are detected
        content +=
          "I'm here to help you explore Bible-related questions and topics. " +
          'Could you ask about a specific verse or topic?';
      }
    }

    return content;
  }

  async getConversations(userId: string) {
    return await this.chatConversationModel
      .find({ userId })
      .sort({ createdAt: -1 });
  }

  async getConversationById(conversationId: string, userId: string) {
    return await this.chatConversationModel.findOne({
      _id: conversationId,
      userId,
    });
  }
}
