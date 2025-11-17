import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';

@ApiTags('waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new entry to the waitlist' })
  @ApiBody({ type: CreateWaitlistEntryDto })
  @ApiResponse({
    status: 201,
    description: 'Success! You are on the waitlist.',
  })
  @ApiResponse({
    status: 409,
    description: 'This email is already on the waitlist.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  create(@Body() createWaitlistEntryDto: CreateWaitlistEntryDto) {
    return this.waitlistService.create(createWaitlistEntryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all waitlist entries' })
  @ApiResponse({ status: 200, description: 'Array of waitlist entries.' })
  findAll() {
    return this.waitlistService.findAll();
  }
}
