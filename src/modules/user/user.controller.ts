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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
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
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResendPasswordResetDto } from './dto/resend-password-reset.dto';
import * as SystemMessages from 'src/shared/constants/systemMessages';

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
    status: HttpStatus.OK,
    description: 'User logged out successfully',
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: SystemMessages.USER_LOGOUT_SUCCESS,
        data: { timestamp: '2025-11-20T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized or token invalid',
  })
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
        statusCode: HttpStatus.BAD_REQUEST,
        message: SystemMessages.INVALID_TOKEN_PAYLOAD,
        data: { timestamp: new Date().toISOString() },
      };
    }
    await this.users.logoutByAccessToken(jti, userId);
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.USER_LOGOUT_SUCCESS,
      data: { timestamp: new Date().toISOString() },
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
        statusCode: HttpStatus.OK,
        message: SystemMessages.USER_DELETED,
        data: { timestamp: '2025-11-20T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async deleteMe(
    @Req() req: Request & { user: { userId: string; id?: string } },
  ) {
    const userId = req.user.userId || req.user.id;
    if (!userId) throw new BadRequestException('Invalid user id');
    await this.users.delete(userId);
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.USER_DELETED,
      data: { timestamp: new Date().toISOString() },
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
        statusCode: 200,
        message: 'User updated successfully',
        data: {
          id: 'uuid-1234',
          email: 'jane.doe@example.com',
          fullName: 'Jane Doe',
          profilePicture: null,
          phoneNumber: null,
          about: 'I love reading the Bible daily.',
          aiSettings: {
            tone: 'friendly',
          },
          timestamp: '2025-11-20T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async updateMe(
    @Req() req: Request & { user: { userId: string; id?: string } },
    @Body() data: UpdateUserDto,
  ) {
    const userId = req.user.userId || req.user.id;
    if (!userId) throw new BadRequestException('Invalid user id');
    const user = await this.users.update(userId, data);
    const filtered = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      about: user.about,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      aiSettings: user.aiSettings,
      timestamp: new Date().toISOString(),
    };
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.USER_UPDATED,
      data: filtered,
    };
  }

  @Post('profile-picture')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user profile picture' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile picture uploaded successfully',
  })
  async uploadProfilePicture(
    @Req() req: Request & { user: { userId: string; id?: string } },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const userId = req.user.userId || req.user.id;
    if (!userId) throw new BadRequestException('Invalid user id');

    const profilePictureUrl = await this.users.uploadProfilePicture(
      userId,
      file,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePictureUrl,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('signup')
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully signed up',
    schema: {
      example: {
        statusCode: HttpStatus.CREATED,
        message: SystemMessages.USER_SIGNUP_SUCCESS,
        data: {
          user: {
            id: 'uuid-1234',
            email: 'jane.doe@example.com',
            fullName: 'Jane Doe',
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
          timestamp: '2025-11-20T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: SystemMessages.USER_ALREADY_EXISTS,
  })
  async signup(@Body() signupDto: SignupUserDto) {
    const result = await this.users.signup(signupDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: SystemMessages.USER_SIGNUP_SUCCESS,
      data: { ...result, timestamp: new Date().toISOString() },
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
        statusCode: HttpStatus.OK,
        message: SystemMessages.USER_LOGIN_SUCCESS,
        data: {
          user: {
            id: 'uuid-1234',
            email: 'jane.doe@example.com',
            fullName: 'Jane Doe',
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
          timestamp: '2025-11-20T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.users.login(loginDto);
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.USER_LOGIN_SUCCESS,
      data: { ...result, timestamp: new Date().toISOString() },
    };
  }

  @Post('google/signup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign up with Google ID token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idToken'],
      properties: {
        idToken: {
          type: 'string',
          description: 'Google ID token from client-side OAuth',
          example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully authenticated with Google',
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: SystemMessages.USER_SIGNUP_SUCCESS,
        data: {
          user: {
            id: 'uuid-1234',
            email: 'user@gmail.com',
            fullName: 'John Doe',
            profilePicture: 'https://lh3.googleusercontent.com/...',
            phoneNumber: null,
            about: null,
          },
          tokens: {
            accessToken: 'eyJhbGci...',
            refreshToken: 'eyJhbGci.refresh...',
            expiresIn: 604800,
            tokenType: 'Bearer',
          },
          timestamp: '2025-11-26T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid Google ID token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Email already exists with different provider',
  })
  async googleAuth(@Body() body: { idToken: string }) {
    const result = await this.users.googleSignUp({
      idToken: body.idToken,
    });
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.USER_SIGNUP_SUCCESS,
      data: { ...result, timestamp: new Date().toISOString() },
    };
  }

  @Post('google/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google ID token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idToken'],
      properties: {
        idToken: {
          type: 'string',
          description: 'Google ID token from client-side OAuth',
          example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully authenticated with Google',
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: SystemMessages.USER_SIGNUP_SUCCESS,
        data: {
          user: {
            id: 'uuid-1234',
            email: 'user@gmail.com',
            fullName: 'John Doe',
            profilePicture: 'https://lh3.googleusercontent.com/...',
            phoneNumber: null,
            about: null,
          },
          tokens: {
            accessToken: 'eyJhbGci...',
            refreshToken: 'eyJhbGci.refresh...',
            expiresIn: 604800,
            tokenType: 'Bearer',
          },
          timestamp: '2025-11-26T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid Google ID token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Email already exists with different provider',
  })
  

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
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
  })
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
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent if user exists',
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: 'Request successful',
        data: {
          token: 'reset-token-or-empty',
          timestamp: '2025-11-20T00:00:00.000Z',
        },
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const { token } = await this.users.forgotPassword(forgotPasswordDto.email);
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.SUCCESSFUL_REQUEST,
      data: { token, timestamp: new Date().toISOString() },
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password successfully reset',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.users.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.PASSWORD_RESET_SUCCESS,
      data: { timestamp: new Date().toISOString() },
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
    status: HttpStatus.OK,
    description: 'Email verified successfully',
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: SystemMessages.EMAIL_VERIFIED,
        data: { timestamp: '2025-11-20T12:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid or expired token | Email verification token has expired',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid or already used verification token',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.users.verifyEmail(verifyEmailDto.email, verifyEmailDto.otp);
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.EMAIL_VERIFIED,
      data: { timestamp: new Date().toISOString() },
    };
  }

  // NEW ENDPOINTS ADDED HERE
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification code resent successfully',
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: SystemMessages.VERIFICATION_CODE_RESENT,
        data: { timestamp: '2025-11-20T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Please wait before requesting another verification code',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Email already verified',
  })
  async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    await this.users.resendVerification(resendVerificationDto.email);
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.VERIFICATION_CODE_RESENT,
      data: { timestamp: new Date().toISOString() },
    };
  }

  @Post('resend-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend password reset code' })
  @ApiBody({ type: ResendPasswordResetDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset code resent successfully',
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: SystemMessages.PASSWORD_RESET_CODE_RESENT,
        data: { timestamp: '2025-11-20T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Daily limit exceeded for password reset requests',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async resendPasswordReset(
    @Body() resendPasswordResetDto: ResendPasswordResetDto,
  ) {
    const { token } = await this.users.resendPasswordReset(
      resendPasswordResetDto.email,
    );
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.PASSWORD_RESET_CODE_RESENT,
      data: { token, timestamp: new Date().toISOString() },
    };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user information',
    schema: {
      example: {
        id: 'uuid-1234',
        email: 'jane.doe@example.com',
        fullName: 'Jane Doe',
        about: 'I love reading the Bible daily.',
        phoneNumber: '+1234567890',
        profilePicture: 'https://example.com/profile.jpg',
        aiSettings: {
          tone: 'friendly',
        },
        authProvider: 'EMAIL',
        emailVerified: true,
        isActive: true,
        createdAt: '2025-11-20T10:00:00.000Z',
        updatedAt: '2025-11-20T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
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
      statusCode: HttpStatus.OK,
      message: SystemMessages.CURRENT_USER_INFO,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        about: user.about,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        aiSettings: user.aiSettings,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
