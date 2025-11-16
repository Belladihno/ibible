import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// We export this type so our Service can use it
export type WaitlistEntryDocument = WaitlistEntry & Document;

@Schema({ timestamps: true }) // timestamps: true adds createdAt/updatedAt
export class WaitlistEntry {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  // We could add more fields here later, like 'name'
  // @Prop()
  // name: string;
}

export const WaitlistEntrySchema = SchemaFactory.createForClass(WaitlistEntry);
