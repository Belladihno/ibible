import { Controller, Get, UseGuards, Query, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserRole } from '../user/enums/user.enums';
import { AdminAnalyticsService } from './admin-analytics.service';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get overview metrics for dashboard cards' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard overview stats with percentage changes',
    schema: {
      example: {
        totalUsers: { value: 1250, change: 15 },
        newUsers: { value: 120, change: 8 },
        activeUsers: { value: 450, change: -2 },
      },
    },
  })
  async getOverview() {
    return this.analyticsService.getOverviewStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user list with activity metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of users decorated with analytics',
    schema: {
      example: {
        data: [
          {
            id: '507f1f77bcf86cd799439011',
            fullName: 'John Doe',
            email: 'john@example.com',
            profilePicture: 'https://example.com/photo.jpg',
            subscriptionTier: 'premium',
            lastLogin: '2025-12-18T15:00:00Z',
            activityLength: '5h 45m',
            createdAt: '2025-11-20T10:30:00Z',
          },
        ],
        meta: {
          total: 1250,
          page: 1,
          limit: 10,
          totalPages: 125,
        },
      },
    },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  async getUsers(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.analyticsService.getUserAnalytics(Number(page), Number(limit));
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get AI/Feature usage trends' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Aggregate counts of feature usage',
    schema: {
      example: {
        trends: [
          { feature: 'chat_message_sent', count: '450' },
          { feature: 'prayer_generate_ai', count: '120' },
          { feature: 'meditation_start', count: '85' },
        ],
      },
    },
  })
  async getUsage() {
    const trends = await this.analyticsService.getUsageTrends();
    return { trends };
  }
}
