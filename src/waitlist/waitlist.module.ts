import { Module } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';
import { MongooseModule } from '@nestjs/mongoose'; // IMPORT THIS
import {
  WaitlistEntry,
  WaitlistEntrySchema,
} from './schemas/waitlist-entry.schema'; // IMPORT THIS

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WaitlistEntry.name, schema: WaitlistEntrySchema },
    ]),
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
