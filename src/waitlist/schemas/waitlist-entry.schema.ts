import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type WaitlistEntryDocument = WaitlistEntry & Document;

@Schema({ timestamps: true })
export class WaitlistEntry {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: false }) // Make it optional
  name: string;
}

export const WaitlistEntrySchema = SchemaFactory.createForClass(WaitlistEntry);
