import {
  Controller,
  Get,
  UseGuards,
  Query,
  HttpStatus,
  Post,
} from '@nestjs/common';
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
import { Throttle } from '@nestjs/throttler';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AppMetricsSyncService } from './app-metrics-sync.service';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(
    private readonly analyticsService: AdminAnalyticsService,
    private readonly appMetricsSyncService: AppMetricsSyncService,
  ) {}

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
        revenue: { value: 15420.5, change: 12 },
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

  @Get('growth')
  @ApiOperation({ summary: 'Get app growth metrics (downloads vs uninstalls)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time series data for downloads and uninstalls',
    schema: {
      example: [
        {
          date: '2025-12-01',
          downloads: 245,
          uninstalls: 23,
          ios: { downloads: 150, uninstalls: 15 },
          android: { downloads: 95, uninstalls: 8 },
        },
      ],
    },
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Time period (week or month)',
    example: 'week',
  })
  async getGrowth(@Query('period') period: 'week' | 'month' = 'week') {
    return this.analyticsService.getGrowthMetrics(period);
  }

  @Post('sync')
  @Throttle({ short: { limit: 1, ttl: 30000 } }) // 1 request per 30 seconds
  @ApiOperation({ summary: 'Manually trigger app metrics sync' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sync completed successfully',
    schema: {
      example: {
        message: 'App metrics sync completed for 2025-12-22',
        date: '2025-12-22',
      },
    },
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Specific date to sync (YYYY-MM-DD)',
    example: '2025-12-22',
  })
  async manualSync(@Query('date') date?: string) {
    return this.appMetricsSyncService.manualSync(date);
  }
}
