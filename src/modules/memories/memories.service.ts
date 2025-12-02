// modules/memories/memories.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Memory, MemoryDocument } from './schemas/memory.schema';
import { AiMemoryService } from './ai-memory.service';
import { RedisService } from '../redis/redis.service';

export interface CleanedMemory {
  id: string;
  userId: string;
  title: string;
  body: string;
  tags?: string[];
  verseRefs?: string[];
  visibility?: 'private' | 'public' | 'shared';
  followUp?: {
    scheduledAt?: Date;
    reminderDeltaDays?: number;
    isCompleted?: boolean;
  };
  aiRephrase?: {
    text?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    jobId?: string;
    processedAt?: Date;
    error?: string;
    source?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  skipAI?: boolean;
  forceAIReprocess?: boolean;
}

interface DuplicateCheck {
  memoryId: string;
  timestamp: Date;
}

// Extended interface for create payload
interface CreateMemoryPayload extends Partial<Memory> {
  skipAI?: boolean;
}

// Extended interface for update payload
interface UpdateMemoryPayload extends Partial<Memory> {
  skipAI?: boolean;
  forceAIReprocess?: boolean;
}

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);

  constructor(
    @InjectModel(Memory.name)
    private readonly memoryModel: Model<MemoryDocument>,
    @Optional() private readonly aiMemoryService?: AiMemoryService,
    @Optional() private readonly redisService?: RedisService,
    @Optional()
    @InjectQueue('memories-processing')
    private readonly aiQueue?: Queue,
  ) {}

  private clean(doc: unknown): CleanedMemory | null {
    if (!doc) return null;

    const maybeDoc = doc as { toJSON?: () => unknown };
    const raw =
      typeof maybeDoc.toJSON === 'function' ? maybeDoc.toJSON() : maybeDoc;

    const obj = { ...(raw as Record<string, unknown>) };

    // Convert _id to id with COMPLETELY SAFE handling - NO toString() calls
    if (obj._id != null) {
      obj.id = this.extractIdFromUnknown(obj._id);
      delete obj._id;
    }

    // Remove __v
    if (obj.__v !== undefined) delete obj.__v;

    // Ensure required fields exist with defaults
    const cleanedMemory: CleanedMemory = {
      id: this.safeString(obj.id) || '',
      userId: this.safeString(obj.userId) || '',
      title: this.safeString(obj.title) || '',
      body: this.safeString(obj.body) || '',
    };

    // Add optional fields if they exist
    if (obj.tags !== undefined) cleanedMemory.tags = obj.tags as string[];
    if (obj.verseRefs !== undefined)
      cleanedMemory.verseRefs = obj.verseRefs as string[];
    if (obj.visibility !== undefined)
      cleanedMemory.visibility = obj.visibility as
        | 'private'
        | 'public'
        | 'shared';
    if (obj.followUp !== undefined)
      cleanedMemory.followUp = obj.followUp as any;
    if (obj.aiRephrase !== undefined)
      cleanedMemory.aiRephrase = obj.aiRephrase as any;
    if (obj.createdAt !== undefined)
      cleanedMemory.createdAt = obj.createdAt as Date;
    if (obj.updatedAt !== undefined)
      cleanedMemory.updatedAt = obj.updatedAt as Date;
    if (obj.skipAI !== undefined) cleanedMemory.skipAI = obj.skipAI as boolean;
    if (obj.forceAIReprocess !== undefined)
      cleanedMemory.forceAIReprocess = obj.forceAIReprocess as boolean;

    return cleanedMemory;
  }

  // SAFE ID extraction without using toString() on objects
  private extractIdFromUnknown(value: unknown): string {
    // Handle primitives safely
    if (value === null || value === undefined) {
      return '';
    }

    // Handle strings
    if (typeof value === 'string') {
      return value;
    }

    // Handle numbers, booleans, etc.
    if (typeof value !== 'object') {
      // Use Number conversion for numbers, String for others would be safe but let's avoid it
      if (typeof value === 'number') {
        return value.toString(); // toString() is safe on numbers
      }
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      return '';
    }

    // Handle objects - AVOID toString() completely
    const obj = value as Record<string, unknown>;

    // Check for MongoDB ObjectId pattern
    if (obj._bsontype === 'ObjectID' || obj.constructor?.name === 'ObjectID') {
      // Try toHexString first (MongoDB ObjectId method)
      if (typeof (obj as any).toHexString === 'function') {
        try {
          const result = (obj as any).toHexString();
          if (typeof result === 'string') {
            return result;
          }
        } catch {
          // Fall through
        }
      }
    }

    // Look for string properties that might contain the ID
    const stringProps = ['id', '_id', 'hex', 'str', 'value', 'key'];
    for (const prop of stringProps) {
      if (typeof obj[prop] === 'string') {
        return obj[prop];
      }
    }

    // Generate a hash from the object
    try {
      const jsonStr = JSON.stringify(obj);
      // Extract any 24-character hex string (MongoDB ObjectId pattern)
      const hexMatch = jsonStr.match(/"([a-f0-9]{24})"/);
      if (hexMatch && hexMatch[1]) {
        return hexMatch[1];
      }
      // Generate deterministic hash
      return `obj_${this.generateStableHash(jsonStr)}`;
    } catch {
      // Last resort: timestamp + random
      return `id_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    }
  }

  // SAFE string conversion without using String() or toString() on objects
  private safeString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    // Handle primitives
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return value.toString(); // Safe on numbers
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'bigint') {
      return value.toString(); // Safe on bigint
    }

    if (typeof value === 'symbol') {
      return value.toString(); // Safe on symbols
    }

    // Handle objects - convert to JSON string
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }

  private generateStableHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  async create(
    userId: string,
    payload: CreateMemoryPayload,
  ): Promise<CleanedMemory | null> {
    // If AI service is available, generate a rephrased version
    let aiRephrase: { text?: string; source?: string } | undefined;

    if (this.aiMemoryService && payload.body && !payload.skipAI) {
      try {
        const rephrasedText = await this.aiMemoryService.rephraseMemory(
          payload.title ?? '',
          payload.body ?? '',
        );
        aiRephrase = { text: rephrasedText, source: 'gemini' };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          'AI rephrase failed, proceeding without it',
          errorMessage,
        );
        aiRephrase = undefined;
      }
    }

    // Check for duplicate using Redis if available
    if (this.redisService && payload.body) {
      const contentHash = this.hashContent(payload.body);
      const duplicateKey = `memory:duplicate:${userId}:${contentHash}`;
      const duplicate =
        await this.redisService.get<DuplicateCheck>(duplicateKey);

      if (duplicate?.memoryId) {
        this.logger.warn(`Possible duplicate memory from user ${userId}`);
        return this.findById(duplicate.memoryId);
      }
    }

    const doc = new this.memoryModel({ ...payload, userId, aiRephrase });
    const saved = await doc.save();
    const cleaned = this.clean(saved);

    // Cache duplicate check
    if (this.redisService && payload.body && cleaned?.id) {
      const contentHash = this.hashContent(payload.body);
      const duplicateKey = `memory:duplicate:${userId}:${contentHash}`;
      await this.redisService.set(
        duplicateKey,
        {
          memoryId: cleaned.id,
          timestamp: new Date(),
        },
        300,
      );
    }

    return cleaned;
  }

  async findById(id: string): Promise<CleanedMemory | null> {
    // Try Redis cache first
    if (this.redisService) {
      const cacheKey = `memory:${id}`;
      const cached = await this.redisService.get<CleanedMemory>(cacheKey);

      if (cached) {
        this.logger.debug(`Cache HIT for memory ${id}`);
        return cached;
      }
    }

    this.logger.debug(`Cache MISS for memory ${id}`);

    const doc = await this.memoryModel.findById(id).exec();
    const cleaned = this.clean(doc);

    // Cache in Redis
    if (this.redisService && cleaned) {
      const cacheKey = `memory:${id}`;
      await this.redisService.set(cacheKey, cleaned, 300);
    }

    return cleaned;
  }

  async findByIdWithAuth(id: string, userId: string): Promise<CleanedMemory> {
    const memory = await this.findById(id);

    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    // Check permissions
    if (memory.userId !== userId && memory.visibility === 'private') {
      throw new NotFoundException('Memory not found');
    }

    return memory;
  }

  async findAll(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    results: CleanedMemory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    // Try Redis cache first
    if (this.redisService) {
      const cacheKey = `memory:${userId}:list:${page}:${limit}`;
      const cached = await this.redisService.get<{
        results: CleanedMemory[];
        total: number;
        page: number;
        limit: number;
      }>(cacheKey);

      if (cached) {
        return cached;
      }
    }

    const [results, total] = await Promise.all([
      this.memoryModel
        .find({ userId })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.memoryModel.countDocuments({ userId }),
    ]);

    const cleaned = results
      .map((r) => this.clean(r))
      .filter((r): r is CleanedMemory => r !== null);

    const response = { results: cleaned, total, page, limit };

    // Cache in Redis
    if (this.redisService) {
      const cacheKey = `memory:${userId}:list:${page}:${limit}`;
      await this.redisService.set(cacheKey, response, 60);
    }

    return response;
  }

  async update(
    id: string,
    payload: UpdateMemoryPayload,
  ): Promise<CleanedMemory | null> {
    // If AI service is available and body or title is being updated, rephrase
    if (
      this.aiMemoryService &&
      (payload.body || payload.title || payload.forceAIReprocess)
    ) {
      try {
        const doc = await this.memoryModel.findById(id).exec();
        const title = payload.title ?? doc?.title ?? '';
        const body = payload.body ?? doc?.body ?? '';

        const rephrasedText = await this.aiMemoryService.rephraseMemory(
          String(title),
          String(body),
        );

        payload.aiRephrase = {
          text: rephrasedText,
          source: 'gemini',
          status: 'completed',
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn('AI rephrase failed during update', errorMessage);
        // Continue without AI rephrase
      }
    }

    const doc = await this.memoryModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();
    const cleaned = this.clean(doc);

    // Invalidate cache
    if (this.redisService && cleaned) {
      await this.redisService.delete(`memory:${id}`);
      if (cleaned.userId) {
        await this.redisService.deletePattern(
          `memory:${cleaned.userId}:list:*`,
        );
      }
    }

    return cleaned;
  }

  async remove(id: string): Promise<CleanedMemory | null> {
    const doc = await this.memoryModel.findByIdAndDelete(id).exec();
    const cleaned = this.clean(doc);

    // Invalidate cache
    if (this.redisService && cleaned) {
      await this.redisService.delete(`memory:${id}`);
      if (cleaned.userId) {
        await this.redisService.deletePattern(
          `memory:${cleaned.userId}:list:*`,
        );
      }
    }

    return cleaned;
  }

  async search(
    userId: string,
    keyword: string,
    page = 1,
    limit = 10,
  ): Promise<{
    results: CleanedMemory[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!keyword?.trim()) {
      return { results: [], total: 0, page, limit };
    }

    const skip = (page - 1) * limit;
    const query: FilterQuery<MemoryDocument> = {
      userId,
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { body: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } },
        { verseRefs: { $regex: keyword, $options: 'i' } },
      ],
    };

    const [results, total] = await Promise.all([
      this.memoryModel
        .find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      this.memoryModel.countDocuments(query),
    ]);

    const cleaned = results
      .map((r) => this.clean(r))
      .filter((r): r is CleanedMemory => r !== null);

    return {
      results: cleaned,
      total,
      page,
      limit,
    };
  }

  async completeFollowUp(id: string): Promise<CleanedMemory | null> {
    const doc = await this.memoryModel
      .findByIdAndUpdate(id, { 'followUp.isCompleted': true }, { new: true })
      .exec();

    if (!doc) {
      return null;
    }

    const cleaned = this.clean(doc);

    // Invalidate cache
    if (this.redisService) {
      await this.redisService.delete(`memory:${id}`);
    }

    return cleaned;
  }

  async getTimeline(userId: string): Promise<{
    results: CleanedMemory[];
    total: number;
  }> {
    const results = await this.memoryModel
      .find({ userId })
      .sort('createdAt')
      .lean()
      .exec();

    const cleaned = results
      .map((r) => this.clean(r))
      .filter((r): r is CleanedMemory => r !== null);

    return { results: cleaned, total: cleaned.length };
  }
}
