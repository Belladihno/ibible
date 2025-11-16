import { Controller, Post, Body, Get } from '@nestjs/common'; // <-- 1. Check this line
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  create(@Body() createWaitlistEntryDto: CreateWaitlistEntryDto) {
    return this.waitlistService.create(createWaitlistEntryDto);
  }

  @Get()
  findAll() {
    return this.waitlistService.findAll();
  }
}
