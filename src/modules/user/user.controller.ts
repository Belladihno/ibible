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
  Headers as HeadersDecorator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserPayload } from './strategy/interface.d';
import { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';
import { LoginDto } from './dto/login-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SignupUserDto } from './dto/signup-user.dto';

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
      statusCode: 200,
      message: 'User logged out and tokens revoked',
      data: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete current user (hard delete from database)' })
  @ApiResponse({
    status: 200,
    description: 'User deleted from database',
    schema: {
      example: {
        status: 'success',
        message: 'User deleted from database',
        timestamp: '2025-11-20T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteMe(
    @Req() req: Request & { user: { userId: string; id?: string } },
  ) {
    const userId = req.user.userId || req.user.id;
    if (!userId) throw new BadRequestException('Invalid user id');
    await this.users.delete(userId);
    return {
      statusCode: 200,
      message: 'User deleted from database',
      data: {
        timestamp: new Date().toISOString(),
      },
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
          about: 'I love reading the Bible daily.',
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
    // Only return safe, user-facing fields
    const filtered = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      about: user.about,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      timestamp: new Date().toISOString(),
    };
    return {
      statusCode: 200,
      message: `User updated successfully`,
      data: filtered,
    };
  }

  @Post('signup')
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully signed up',
    schema: {
      example: {
        user: {
          id: 'uuid-1234',
          email: 'jane.doe@example.com',
          fullName: 'Jane Doe',
          authProvider: 'EMAIL',
          profilePicture: null,
          phoneNumber: null,
          about: null,
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
    description: 'User with this email or phone number already exists',
  })
  async signup(@Body() signupDto: SignupUserDto) {
    const result = await this.users.signup(signupDto);
    return {
      statusCode: 201,
      message: 'User successfully signed up',
      data: {
        ...result,
        timestamp: new Date().toISOString(),
      },
    };
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
          profilePicture: null,
          phoneNumber: null,
          about: null,
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
    const result = await this.users.login(loginDto);
    return {
      statusCode: 200,
      message: 'User successfully logged in',
      data: {
        ...result,
        timestamp: new Date().toISOString(),
      },
    };
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
  @ApiHeader({ name: 'Authorization', description: 'Bearer <refreshToken>' })
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
  async refreshToken(@HeadersDecorator('authorization') authorization: string) {
    if (!authorization) {
      throw new BadRequestException('Missing Authorization header');
    }
    const [scheme, token] = authorization.split(' ');
    if (!token || scheme.toLowerCase() !== 'bearer') {
      throw new BadRequestException(
        'Invalid Authorization header format. Expected: Bearer <token>',
      );
    }
    return this.users.refreshToken(token);
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
      statusCode: 200,
      message: 'Request successful',
      data: {
        token,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 404, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.users.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
    return {
      statusCode: 200,
      message: 'Password successfully reset',
      data: {
        timestamp: new Date().toISOString(),
      },
    };
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
        about: 'I love reading the Bible daily.',
        phoneNumber: '+1234567890',
        profilePicture: 'https://example.com/profile.jpg',
        authProvider: 'EMAIL',
        emailVerified: true,
        isActive: true,
        createdAt: '2025-11-20T10:00:00.000Z',
        updatedAt: '2025-11-20T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
  ) {
    // Safely extract userId from possible JWT payload keys
    type JwtPayload = {
      userId?: string;
      sub?: string;
      id?: string;
      [key: string]: unknown;
    };
    const payload = req.user as unknown as JwtPayload;
    const userId = payload.userId ?? payload.sub ?? payload.id;
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user id');
    }

    // Load full user from DB to return up-to-date profile fields
    const user = await this.users.findOne(userId);

    // Return only safe, useful profile fields
    return {
      statusCode: 200,
      message: 'Current user information',
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        about: user.about,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify user email',
    description: 'Verify user email with token sent to email address',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        status: 'success',
        message: 'Email verified successfully',
        timestamp: '2025-11-20T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid or expired token | Email verification token has expired',
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid or already used verification token',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.users.verifyEmail(verifyEmailDto.email, verifyEmailDto.otp);
    return {
      statusCode: 200,
      message: 'Email verified successfully',
      data: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
