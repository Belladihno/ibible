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
import * as SystemMessages from 'src/shared/constants/systemMessages';

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
  private memoryCache = new Map<
    string,
    { data: CleanedMemory; expires: number }
  >();

  constructor(
    @InjectModel(Memory.name)
    private readonly memoryModel: Model<MemoryDocument>,
    @Optional() private readonly aiMemoryService?: AiMemoryService,
    @Optional() private readonly redisService?: RedisService,
    @Optional()
    @InjectQueue('memories-processing')
    private readonly aiQueue?: Queue,
  ) {
    // Log service initialization
    this.logger.log('MemoriesService initialized');

    // Check Redis service availability
    if (this.redisService) {
      this.logger.log('✅ RedisService is AVAILABLE for caching');
    } else {
      this.logger.warn('⚠️ RedisService is NOT available - caching disabled');
    }

    // Check AI service availability
    if (this.aiMemoryService) {
      this.logger.log('✅ AiMemoryService is AVAILABLE');
    } else {
      this.logger.warn('⚠️ AiMemoryService is NOT available');
    }

    // Check Queue availability
    if (this.aiQueue) {
      this.logger.log('✅ BullMQ Queue is AVAILABLE');
    } else {
      this.logger.warn('⚠️ BullMQ Queue is NOT available');
    }
  }

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

  private extractIdFromUnknown(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

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

    try {
      const jsonStr = JSON.stringify(obj);

      const hexMatch = jsonStr.match(/"([a-f0-9]{24})"/);
      if (hexMatch && hexMatch[1]) {
        return hexMatch[1];
      }

      return `obj_${this.generateStableHash(jsonStr)}`;
    } catch {
      return `id_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    }
  }

  private safeString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value === 'symbol') {
      return value.toString();
    }

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
      hash = hash & hash;
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
    this.logger.debug(`Creating memory for user ${userId}`);

    let aiRephrase: { text?: string; source?: string } | undefined;

    if (this.aiMemoryService && payload.body && !payload.skipAI) {
      try {
        this.logger.debug('Attempting AI rephrase for new memory');
        const rephrasedText = await this.aiMemoryService.rephraseMemory(
          payload.title ?? '',
          payload.body ?? '',
        );
        aiRephrase = { text: rephrasedText, source: 'gemini' };
        this.logger.debug('AI rephrase successful');
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          'AI rephrase failed, proceeding without it',
          errorMessage,
        );
        aiRephrase = undefined;
      }
    } else if (payload.skipAI) {
      this.logger.debug('AI rephrase skipped (skipAI: true)');
    }

    if (this.redisService && payload.body) {
      const contentHash = this.hashContent(payload.body);
      const duplicateKey = `memory:duplicate:${userId}:${contentHash}`;
      this.logger.debug(`Checking duplicate with key: ${duplicateKey}`);

      try {
        const duplicate =
          await this.redisService.get<DuplicateCheck>(duplicateKey);

        if (duplicate?.memoryId) {
          this.logger.warn(`Possible duplicate memory from user ${userId}`);
          return this.findById(duplicate.memoryId);
        }
      } catch (error) {
        this.logger.error('Redis duplicate check failed:', error);
      }
    }

    const doc = new this.memoryModel({ ...payload, userId, aiRephrase });
    const saved = await doc.save();
    const cleaned = this.clean(saved);

    this.logger.debug(`Memory created with ID: ${cleaned?.id}`);

    // Cache duplicate check
    if (this.redisService && payload.body && cleaned?.id) {
      const contentHash = this.hashContent(payload.body);
      const duplicateKey = `memory:duplicate:${userId}:${contentHash}`;

      try {
        await this.redisService.set(
          duplicateKey,
          {
            memoryId: cleaned.id,
            timestamp: new Date(),
          },
          300,
        );
        this.logger.debug(`Duplicate check cached for key: ${duplicateKey}`);
      } catch (error) {
        this.logger.error('Failed to cache duplicate check:', error);
      }
    }

    return cleaned;
  }

  async findById(id: string): Promise<CleanedMemory | null> {
    this.logger.debug(`=== FIND BY ID: ${id} ===`);

    // First check in-memory cache
    const memoryCached = this.memoryCache.get(id);
    if (memoryCached && memoryCached.expires > Date.now()) {
      this.logger.debug(`✅ In-memory Cache HIT for ${id}`);
      return memoryCached.data;
    }

    // Try Redis cache first
    if (this.redisService) {
      const cacheKey = `memory:${id}`;

      try {
        this.logger.debug(`🔍 Checking Redis cache for key: ${cacheKey}`);

        const cached = await this.redisService.get<CleanedMemory>(cacheKey);

        if (cached) {
          this.logger.debug(`✅ Redis Cache HIT for memory ${id}`);

          // Also store in in-memory cache for faster access
          this.memoryCache.set(id, {
            data: cached,
            expires: Date.now() + 60000, // 1 minute in-memory cache
          });

          return cached;
        }

        this.logger.debug(`❌ Redis Cache MISS for memory ${id}`);
      } catch (redisError) {
        this.logger.error(
          `Redis error when checking cache for ${id}:`,
          redisError,
        );
        // Continue to database if Redis fails
      }
    } else {
      this.logger.debug(
        `⚠️ RedisService is NOT available, skipping Redis cache`,
      );
    }

    this.logger.debug(`📋 Fetching memory ${id} from database`);

    const doc = await this.memoryModel.findById(id).exec();
    const cleaned = this.clean(doc);

    // Cache in Redis
    if (this.redisService && cleaned) {
      const cacheKey = `memory:${id}`;

      try {
        this.logger.debug(
          `💾 Attempting to set Redis cache for key: ${cacheKey}`,
        );

        await this.redisService.set(cacheKey, cleaned, 300);
        this.logger.debug(`✅ Redis Cache SET for memory ${id} (TTL: 300s)`);
      } catch (setError) {
        this.logger.error(`Failed to set Redis cache for ${id}:`, setError);
      }
    }

    // Always store in in-memory cache
    if (cleaned) {
      this.memoryCache.set(id, {
        data: cleaned,
        expires: Date.now() + 60000, // 1 minute in-memory cache
      });
      this.logger.debug(`✅ In-memory Cache SET for ${id}`);
    }

    return cleaned;
  }

  async findByIdWithAuth(id: string, userId: string): Promise<CleanedMemory> {
    this.logger.debug(`Finding memory ${id} with auth for user ${userId}`);

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
    this.logger.debug(
      `Finding all memories for user ${userId}, page ${page}, limit ${limit}`,
    );

    const skip = (page - 1) * limit;

    if (this.redisService) {
      const cacheKey = `memory:${userId}:list:${page}:${limit}`;

      try {
        this.logger.debug(`🔍 Checking Redis for list cache: ${cacheKey}`);

        const cached = await this.redisService.get<{
          results: CleanedMemory[];
          total: number;
          page: number;
          limit: number;
        }>(cacheKey);

        if (cached) {
          this.logger.debug(`✅ Redis List Cache HIT for user ${userId}`);
          return cached;
        }

        this.logger.debug(`❌ Redis List Cache MISS for user ${userId}`);
      } catch (error) {
        this.logger.error('Redis list cache check failed:', error);
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

      try {
        await this.redisService.set(cacheKey, response, 60);
        this.logger.debug(
          `✅ Redis List Cache SET for user ${userId} (TTL: 60s)`,
        );
      } catch (error) {
        this.logger.error('Failed to set list cache:', error);
      }
    }

    return response;
  }

  async update(
    id: string,
    payload: UpdateMemoryPayload,
  ): Promise<CleanedMemory | null> {
    this.logger.debug(`Updating memory ${id}`);

    // If AI service is available and body or title is being updated, rephrase
    if (
      this.aiMemoryService &&
      (payload.body || payload.title || payload.forceAIReprocess)
    ) {
      try {
        this.logger.debug('Attempting AI rephrase for updated memory');
        const doc = await this.memoryModel.findById(id).exec();

        if (!doc) {
          this.logger.debug('memory not dound');
          throw new NotFoundException(`Memory Not found`);
        }

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
        this.logger.debug('AI rephrase successful for update');
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

    if (!doc) {
      this.logger.debug('memory not found');
      throw new NotFoundException(SystemMessages.MEMORY_NOT_FOUND);
    }
    const cleaned = this.clean(doc);

    // Invalidate cache
    if (this.redisService && cleaned) {
      try {
        await this.redisService.delete(`memory:${id}`);
        this.logger.debug(`✅ Invalidated Redis cache for memory ${id}`);

        if (cleaned.userId) {
          await this.redisService.deletePattern(
            `memory:${cleaned.userId}:list:*`,
          );
          this.logger.debug(
            `✅ Invalidated list cache for user ${cleaned.userId}`,
          );
        }
      } catch (error) {
        this.logger.error('Cache invalidation failed:', error);
      }
    }

    // Also invalidate in-memory cache
    this.memoryCache.delete(id);
    this.logger.debug(`✅ Invalidated in-memory cache for ${id}`);

    return cleaned;
  }

  async remove(id: string): Promise<CleanedMemory | null> {
    this.logger.debug(`Removing memory ${id}`);

    const doc = await this.memoryModel.findByIdAndDelete(id).exec();

    if (!doc) {
      this.logger.debug(`Memory not found`);
      throw new NotFoundException(SystemMessages.MEMORY_NOT_FOUND);
    }

    const cleaned = this.clean(doc);

    // Invalidate cache
    if (this.redisService && cleaned) {
      try {
        await this.redisService.delete(`memory:${id}`);
        this.logger.debug(
          `✅ Invalidated Redis cache for deleted memory ${id}`,
        );

        if (cleaned.userId) {
          await this.redisService.deletePattern(
            `memory:${cleaned.userId}:list:*`,
          );
          this.logger.debug(
            `✅ Invalidated list cache for user ${cleaned.userId}`,
          );
        }
      } catch (error) {
        this.logger.error('Cache invalidation failed on delete:', error);
      }
    }

    // Also invalidate in-memory cache
    this.memoryCache.delete(id);
    this.logger.debug(`✅ Invalidated in-memory cache for deleted ${id}`);

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
    this.logger.debug(
      `Searching memories for user ${userId}, keyword: "${keyword}"`,
    );

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
    this.logger.debug(`Completing follow-up for memory ${id}`);

    const doc = await this.memoryModel.findById(id);

    if (!doc) {
      throw new NotFoundException(SystemMessages.MEMORY_NOT_FOUND);
    }

    if (doc.followUp?.isCompleted === true) {
      this.logger.debug('follow status is already updated');
    } else {
      doc.followUp = { ...doc.followUp, isCompleted: true };
      await doc.save();
    }

    const cleaned = this.clean(doc);

    // Invalidate cache
    if (this.redisService) {
      try {
        await this.redisService.delete(`memory:${id}`);
        this.logger.debug(
          `✅ Invalidated cache for memory ${id} after follow-up`,
        );
      } catch (error) {
        this.logger.error('Cache invalidation failed on follow-up:', error);
      }
    }

    // Also invalidate in-memory cache
    this.memoryCache.delete(id);

    return cleaned;
  }

  async getTimeline(userId: string): Promise<{
    results: CleanedMemory[];
    total: number;
  }> {
    this.logger.debug(`Getting timeline for user ${userId}`);

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

  // Redis connection test method
  async testRedisConnection(): Promise<{
    redisAvailable: boolean;
    connectionTest: boolean;
    setTest: boolean;
    getTest: boolean;
    inMemoryCacheSize: number;
  }> {
    const testKey = `memories:test:${Date.now()}`;
    const testValue = { test: 'value', timestamp: new Date().toISOString() };

    const result = {
      redisAvailable: !!this.redisService,
      connectionTest: false,
      setTest: false,
      getTest: false,
      inMemoryCacheSize: this.memoryCache.size,
    };

    if (!this.redisService) {
      this.logger.warn('RedisService is not available (undefined)');
      return result;
    }

    try {
      // Test connection by setting a value
      this.logger.debug(`Testing Redis SET with key: ${testKey}`);
      await this.redisService.set(testKey, testValue, 10);
      result.setTest = true;

      // Test retrieval
      this.logger.debug(`Testing Redis GET with key: ${testKey}`);
      const retrieved = await this.redisService.get<any>(testKey);
      result.getTest = !!retrieved && retrieved.test === 'value';

      result.connectionTest = true;

      this.logger.debug(`Redis test result: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('Redis connection test failed:', error);
    }

    return result;
  }

  // Get cache statistics
  getCacheStats(): {
    inMemoryCacheSize: number;
    redisAvailable: boolean;
  } {
    return {
      inMemoryCacheSize: this.memoryCache.size,
      redisAvailable: !!this.redisService,
    };
  }
}
