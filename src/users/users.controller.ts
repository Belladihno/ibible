import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
    schema: {
      example: {
        success: true,
        message: 'User created successfully',
        data: {
          id: '0249d34a-9a2b-4876-8de1-2c20bfdcf92e',
          email: 'joh2n.doe@example.com',
          passwordHash:
            '$2b$10$9uTImgqd37vyzOP1TwaXK.PqCmWL8qmIN5DPv7Lb0gAsfxo0QipvC',
          fullName: null,
          profilePicture: null,
          phoneNumber: null,
          authProvider: 'email',
          googleId: null,
          appleId: null,
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          subscriptionStartedAt: null,
          subscriptionExpiresAt: null,
          preferredLanguage: 'en',
          preferredBibleVersion: 'KJV',
          preferredVoice: 'female',
          meditationTimeMorning: '06:00:00',
          meditationTimeEvening: '20:00:00',
          timezone: 'UTC',
          onboardingCompleted: false,
          emailVerified: false,
          isActive: true,
          createdAt: '2025-11-18T11:17:20.427Z',
          updatedAt: '2025-11-18T11:17:20.427Z',
          lastActiveAt: null,
          deletedAt: null,
        },
        timestamp: '2025-11-18T12:17:20.449Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate email request',
    schema: {
      example: {
        success: false,
        message: 'Email already exists.',
        error: 'Conflict',
        statusCode: 409,
        timestamp: '2025-11-18T12:32:24.522Z',
      },
    },
  })
  async create(@Body() data: CreateUserDto) {
    const createdUser = await this.users.create(data);

    return {
      success: true,
      message: 'User created successfully',
      data: { ...createdUser },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 201,
    description: 'Return all users',
    schema: {
      example: {
        success: true,
        message: 'Found 3 users',
        data: [
          {
            id: 'e4e51f2a-1d21-4012-b882-0b274250daf4',
            email: 'john.doe@example.com',
            passwordHash:
              '$2b$10$VNEI/RG6TorRoLy/FDbPA.hBMjKBVkSk9JrvzWqSQHPJCdEkT5pHG',
            fullName: null,
            profilePicture: null,
            phoneNumber: null,
            authProvider: 'email',
            googleId: null,
            appleId: null,
            subscriptionTier: 'free',
            subscriptionStatus: 'active',
            subscriptionStartedAt: null,
            subscriptionExpiresAt: null,
            preferredLanguage: 'en',
            preferredBibleVersion: 'KJV',
            preferredVoice: 'female',
            meditationTimeMorning: '06:00:00',
            meditationTimeEvening: '20:00:00',
            timezone: 'UTC',
            onboardingCompleted: false,
            emailVerified: false,
            isActive: true,
            createdAt: '2025-11-18T11:08:43.931Z',
            updatedAt: '2025-11-18T11:08:43.931Z',
            lastActiveAt: null,
            deletedAt: null,
          },
        ],
        timestamp: '2025-11-18T12:22:33.660Z',
      },
    },
  })
  async findAll() {
    const users = await this.users.findAll();
    const message =
      Array.isArray(users) && users.length
        ? `Found ${users.length} user${users.length > 1 ? 's' : ''}`
        : 'No users found';

    return {
      success: true,
      message,
      data: users,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 201,
    description: 'Returned specific user by user ID',
    schema: {
      example: {
        success: true,
        message: 'User retrieved successfully',
        data: {
          id: 'e4e51f2a-1d21-4012-b882-0b274250daf4',
          email: 'john.doe@example.com',
          passwordHash:
            '$2b$10$VNEI/RG6TorRoLy/FDbPA.hBMjKBVkSk9JrvzWqSQHPJCdEkT5pHG',
          fullName: null,
          profilePicture: null,
          phoneNumber: null,
          authProvider: 'email',
          googleId: null,
          appleId: null,
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          subscriptionStartedAt: null,
          subscriptionExpiresAt: null,
          preferredLanguage: 'en',
          preferredBibleVersion: 'KJV',
          preferredVoice: 'female',
          meditationTimeMorning: '06:00:00',
          meditationTimeEvening: '20:00:00',
          timezone: 'UTC',
          onboardingCompleted: false,
          emailVerified: false,
          isActive: true,
          createdAt: '2025-11-18T11:08:43.931Z',
          updatedAt: '2025-11-18T11:08:43.931Z',
          lastActiveAt: null,
          deletedAt: null,
        },
        timestamp: '2025-11-18T12:25:38.802Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        success: false,
        message: 'User not found',
        error: 'Not Found',
        statusCode: 404,
        timestamp: '2025-11-18T12:51:40.367Z',
      },
    },
  })
  async findOne(@Param('id') id: string) {
    const user = await this.users.findOne(id);
    return {
      status: 'success',
      message: `User retrieved successfully`,
      data: { ...user },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({
    status: 201,
    description: 'Update user successfully',
    schema: {
      example: {
        success: true,
        message: 'User updated successfully',
        data: {
          id: 'e4e51f2a-1d21-4012-b882-0b274250daf4',
          email: 'john.doe@example.com',
          passwordHash:
            '$2b$10$VNEI/RG6TorRoLy/FDbPA.hBMjKBVkSk9JrvzWqSQHPJCdEkT5pHG',
          fullName: null,
          profilePicture: null,
          phoneNumber: null,
          authProvider: 'email',
          googleId: null,
          appleId: null,
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          subscriptionStartedAt: null,
          subscriptionExpiresAt: null,
          preferredLanguage: 'en',
          preferredBibleVersion: 'KJV',
          preferredVoice: 'female',
          meditationTimeMorning: '06:00:00',
          meditationTimeEvening: '20:00:00',
          timezone: 'UTC',
          onboardingCompleted: false,
          emailVerified: false,
          isActive: true,
          createdAt: '2025-11-18T11:08:43.931Z',
          updatedAt: '2025-11-18T11:08:43.931Z',
          lastActiveAt: null,
          deletedAt: null,
          full_name: 'John Micheal',
        },
        timestamp: '2025-11-18T12:27:05.725Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        success: false,
        message: 'User with ID e4e51f2a-1d21-4012-b882-0b274250daf4 not found',
        error: 'Not Found',
        statusCode: 404,
        timestamp: '2025-11-18T12:58:07.723Z',
      },
    },
  })
  async update(@Param('id') id: string, @Body() data: UpdateUserDto) {
    const user = await this.users.update(id, data);
    return {
      status: 'success',
      message: `User updated successfully`,
      data: { ...user },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({
    status: 201,
    description: 'Delete user by ID and return deleted user object.',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'e4e51f2a-1d21-4012-b882-0b274250daf4',
          email: 'john.doe@example.com',
          passwordHash:
            '$2b$10$VNEI/RG6TorRoLy/FDbPA.hBMjKBVkSk9JrvzWqSQHPJCdEkT5pHG',
          fullName: null,
          profilePicture: null,
          phoneNumber: null,
          authProvider: 'email',
          googleId: null,
          appleId: null,
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          subscriptionStartedAt: null,
          subscriptionExpiresAt: null,
          preferredLanguage: 'en',
          preferredBibleVersion: 'KJV',
          preferredVoice: 'female',
          meditationTimeMorning: '06:00:00',
          meditationTimeEvening: '20:00:00',
          timezone: 'UTC',
          onboardingCompleted: false,
          emailVerified: false,
          isActive: false,
          createdAt: '2025-11-18T11:08:43.931Z',
          updatedAt: '2025-11-18T11:27:52.493Z',
          lastActiveAt: null,
          deletedAt: '2025-11-18T12:27:52.585Z',
        },
        timestamp: '2025-11-18T12:27:52.609Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        success: false,
        message: 'User with ID e4e51f2a-1d21-4012-b882-0b274250daf4 not found',
        error: 'Not Found',
        statusCode: 404,
        timestamp: '2025-11-18T12:58:07.723Z',
      },
    },
  })
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
