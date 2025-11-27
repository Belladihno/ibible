import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { LogEmotionDto } from './dto/log-emotion.dto';
import {} from './dto/get-verses-by-emotion.dto';

@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}
}
