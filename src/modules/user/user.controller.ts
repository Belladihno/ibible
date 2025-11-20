import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  Patch,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserPayload } from './strategy/interface.d';
import { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';
import { LoginDto } from './dto/login-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(
    private readonly users: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user (invalidate access and refresh tokens)',
  })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully',
    schema: {
      example: {
        status: 'success',
        message: 'User logged out and tokens revoked',
        timestamp: '2025-11-20T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized or token invalid' })
  async logout(
    @Req()
    req: Request & {
      user: { userId?: string; jti?: string; sub?: string; id?: string };
    },
  ) {
    const user = req.user;
    const jti = user.jti;
    const userId = user.userId || user.sub || user.id;
    if (!jti || !userId) {
      return {
        status: 'error',
        message: 'Invalid token payload',
      };
    }
    await this.users.logoutByAccessToken(jti, userId);
    return {
      status: 'success',
      message: 'User logged out and tokens revoked',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate (soft delete) current user' })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully',
    schema: {
      example: {
        status: 'success',
        message: 'User account deleted successfully',
        timestamp: '2025-11-20T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deactivateMe(
    @Req() req: Request & { user: { userId: string; id?: string } },
  ) {
    const userId = req.user.userId || req.user.id;
    if (!userId) throw new BadRequestException('Invalid user id');
    await this.users.remove(userId);
    return {
      status: 'success',
      message: 'User account deleted successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user info' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      example: {
        status: 'success',
        message: 'User updated successfully',
        data: {
          id: 'uuid-1234',
          email: 'jane.doe@example.com',
          fullName: 'Jane Doe',
          authProvider: 'EMAIL',
          profilePicture: null,
          phoneNumber: null,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMe(
    @Req() req: Request & { user: { userId: string; id?: string } },
    @Body() data: UpdateUserDto,
  ) {
    const userId = req.user.userId || req.user.id;
    if (!userId) throw new BadRequestException('Invalid user id');
    const user = await this.users.update(userId, data);
    return {
      status: 'success',
      message: `User updated successfully`,
      data: { ...user },
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        user: {
          id: 'uuid-1234',
          email: 'jane.doe@example.com',
          fullName: 'Jane Doe',
          authProvider: 'EMAIL',
          profilePicture: null,
          phoneNumber: null,
        },
        tokens: {
          accessToken: 'eyJhbGci...',
          refreshToken: 'eyJhbGci.refresh...',
          expiresIn: 900,
          tokenType: 'Bearer',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async register(@Body() registerDto: CreateUserDto) {
    return this.users.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    schema: {
      example: {
        user: {
          id: 'uuid-1234',
          email: 'jane.doe@example.com',
          fullName: 'Jane Doe',
          authProvider: 'EMAIL',
        },
        tokens: {
          accessToken: 'eyJhbGci...',
          refreshToken: 'eyJhbGci.refresh...',
          expiresIn: 900,
          tokenType: 'Bearer',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.users.login(loginDto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // passport will redirect to provider
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: Request & { user: UserPayload },
    @Res() res: Response,
  ) {
    const userDetails = req.user;
    const authResult = await this.users.validateGoogleUser(userDetails);
    const redirectUrl = `${this.configService.get('FRONTEND_URL')}?token=${authResult?.msg}`;
    return res.redirect(redirectUrl);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { refreshToken: { type: 'string' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    schema: {
      example: {
        accessToken: 'eyJhbGci...',
        refreshToken: 'eyJhbGci.refresh...',
        expiresIn: 900,
        tokenType: 'Bearer',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.users.refreshToken(refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if user exists',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        token: 'reset-token-or-empty',
        timestamp: '2025-11-20T00:00:00.000Z',
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const { token } = await this.users.forgotPassword(forgotPasswordDto.email);
    return {
      success: true,
      message: 'Request successful',
      token,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 404, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.users.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    schema: {
      example: {
        id: 'uuid-1234',
        email: 'jane.doe@example.com',
        fullName: 'Jane Doe',
        authProvider: 'EMAIL',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentUser(
    @Req() req: Request & { user: UserPayload & { jti?: string } },
  ) {
    // Hide internal JWT fields like jti
    const { ...user } = req.user || {};
    return user;
  }
}
