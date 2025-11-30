import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      if (ret._id != null) {
        const rawId = ret._id as unknown;
        if (
          typeof rawId === 'object' &&
          rawId &&
          typeof (rawId as any).toString === 'function'
        ) {
          ret.id = (rawId as any).toString();
        } else {
          ret.id = String(rawId);
        }
        delete (ret as any)._id;
      }
      if ((ret as any).__v !== undefined) delete (ret as any).__v;
      return ret;
    },
  },
})
export class Memory {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop([String])
  tags?: string[];

  @Prop([String])
  verseRefs?: string[];

  @Prop({ default: 'private' })
  visibility?: 'private' | 'public';

  @Prop({ type: Object })
  followUp?: {
    scheduledAt?: Date;
    reminderDeltaDays?: number;
    isCompleted?: boolean;
  };

  @Prop({ type: Object })
  aiRephrase?: { text?: string; source?: any };
}

export type MemoryDocument = Memory & Document;

export const MemorySchema = SchemaFactory.createForClass(Memory);
MemorySchema.index(
  { title: 'text', body: 'text' },
  { weights: { title: 10, body: 5 } },
);
