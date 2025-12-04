// modules/memories/schemas/memory.schema.ts (add this field)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Memory extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  verseRefs: string[];

  @Prop({ enum: ['private', 'public', 'shared'], default: 'private' })
  visibility: 'private' | 'public' | 'shared';

  @Prop({
    type: {
      scheduledAt: { type: Date, default: Date.now },
      reminderDeltaDays: { type: Number, default: null },
      isCompleted: { type: Boolean, default: false },
    },
  })
  followUp?: {
    scheduledAt?: Date;
    reminderDeltaDays?: number;
    isCompleted?: boolean;
  };

  @Prop({
    type: {
      text: String,
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
      },
      jobId: String,
      processedAt: Date,
      error: String,
      source: String,
    },
    default: null,
  })
  aiRephrase?: {
    text?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    jobId?: string;
    processedAt?: Date;
    error?: string;
    source?: string;
  };

  @Prop({ default: false })
  skipAI?: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type MemoryDocument = Memory & Document;
export const MemorySchema = SchemaFactory.createForClass(Memory);
