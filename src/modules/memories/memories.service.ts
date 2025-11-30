import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Memory, MemoryDocument } from './schemas/memory.schema';
import { AiMemoryService } from './ai-memory.service';

@Injectable()
export class MemoriesService {
  constructor(
    @InjectModel(Memory.name) private memoryModel: Model<MemoryDocument>,
    @Optional() private aiMemoryService?: AiMemoryService,
  ) {}

  private clean(doc: unknown): Partial<Memory> | null {
    if (!doc) return null;
    // If it's a Mongoose document, prefer toJSON() to apply schema transform
    const maybeDoc = doc as { toJSON?: () => unknown };
    const raw =
      typeof maybeDoc.toJSON === 'function'
        ? maybeDoc.toJSON()
        : (maybeDoc as unknown);
    const obj = { ...(raw as Record<string, unknown>) } as Record<
      string,
      unknown
    >;
    // Ensure id is string
    if (obj._id != null) {
      const rawId = obj._id as unknown;
      if (
        typeof rawId === 'object' &&
        rawId &&
        typeof (rawId as any).toString === 'function'
      ) {
        obj.id = (rawId as any).toString();
      } else {
        obj.id = String(rawId);
      }
      delete obj._id;
    }
    if (obj.__v !== undefined) delete obj.__v;
    return obj as Partial<Memory>;
  }

  async create(
    userId: string,
    payload: Partial<Memory>,
  ): Promise<Partial<Memory> | null> {
    // If AI service is available, generate a rephrased version
    let aiRephrase: any = undefined;
    try {
      if (this.aiMemoryService && payload.body) {
        const re = await this.aiMemoryService.rephraseMemory(
          payload.title ?? '',
          payload.body ?? '',
        );
        aiRephrase = { text: re, source: 'gemini' };
      }
    } catch (e) {
      // Log silently by design; creation should still proceed if AI fails
    }

    const doc = new this.memoryModel({ ...payload, userId, aiRephrase });
    const saved = await doc.save();
    return this.clean(saved);
  }

  async findAll(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    results: Partial<Memory>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
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
    const cleaned = results.map((r) => {
      const obj = { ...(r as Record<string, unknown>) } as Record<
        string,
        unknown
      >;
      if (obj._id != null) {
        const rawId = obj._id as unknown;
        if (
          typeof rawId === 'object' &&
          rawId &&
          typeof (rawId as any).toString === 'function'
        ) {
          obj.id = (rawId as any).toString();
        } else {
          obj.id = String(rawId);
        }
        delete obj._id;
      }
      if (obj.__v !== undefined) delete obj.__v;
      return obj as Partial<Memory>;
    });
    return { results: cleaned, total, page, limit };
  }

  async findById(id: string): Promise<Partial<Memory> | null> {
    const doc = await this.memoryModel.findById(id).exec();
    return this.clean(doc);
  }

  async update(
    id: string,
    payload: Partial<Memory>,
  ): Promise<Partial<Memory> | null> {
    const updatePayload = { ...payload };
    // If AI service is available and body or title is being updated, rephrase
    try {
      if (this.aiMemoryService && (payload.body || payload.title)) {
        const doc = await this.memoryModel.findById(id).exec();
        // Use updated values if present, else fallback to existing
        const title = payload.title ?? (doc as any)?.title ?? '';
        const body = payload.body ?? (doc as any)?.body ?? '';
        const re = await this.aiMemoryService.rephraseMemory(
          String(title),
          String(body),
        );
        updatePayload.aiRephrase = { text: re, source: 'gemini' };
      }
    } catch (e) {
      // Log silently; update should still proceed if AI fails
    }
    const doc = await this.memoryModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .exec();
    return this.clean(doc);
  }

  async remove(id: string): Promise<Partial<Memory> | null> {
    const doc = await this.memoryModel.findByIdAndDelete(id).exec();
    return this.clean(doc);
  }

  async search(userId: string, keyword: string, page = 1, limit = 10) {
    if (!keyword || keyword.trim() === '') {
      return { results: [], total: 0, page, limit };
    }

    const skip = (page - 1) * limit;

    const query = {
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

    return {
      results: results.map((r) => this.clean(r)),
      total,
      page,
      limit,
    };
  }

  async completeFollowUp(id: string): Promise<Partial<Memory> | null> {
    const doc = await this.memoryModel
      .findByIdAndUpdate(id, { 'followUp.isCompleted': true }, { new: true })
      .exec();

    if (!doc) {
      return null; // Or throw NotFoundException if you prefer
    }

    return this.clean(doc);
  }
  async getTimeline(userId: string): Promise<{
  results: Partial<Memory>[];
  total: number;
}> {
  const results = await this.memoryModel
    .find({ userId })
    .sort('createdAt') // Ascending order for chronological timeline
    .lean()
    .exec();

  const cleaned = results.map((r) => {
    const obj = { ...(r as Record<string, unknown>) } as Record
      string,
      unknown
    >;
    if (obj._id != null) {
      const rawId = obj._id as unknown;
      if (
        typeof rawId === 'object' &&
        rawId &&
        typeof (rawId as any).toString === 'function'
      ) {
        obj.id = (rawId as any).toString();
      } else {
        obj.id = String(rawId);
      }
      delete obj._id;
    }
    if (obj.__v !== undefined) delete obj.__v;
    return obj as Partial<Memory>;
  });

  return { results: cleaned, total: cleaned.length };
 }
}
