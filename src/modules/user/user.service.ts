import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthProvider } from './enums/user.enums';
import { LoginDto } from './dto/login-user.dto';
import { SignupUserDto } from './dto/signup-user.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { UserPayload } from './strategy/interface';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { AccessToken } from '../../entities/access-token.entity';
import { EmailVerificationToken } from '../../entities/email-verification-token.entity';
import { EmailService } from '../email';
import { EmailTemplateId } from '../email';
import { User } from 'src/entities/user.entity';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class UserService {
  private client: OAuth2Client;
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepo: Repository<PasswordResetToken>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(AccessToken)
    private accessTokenRepo: Repository<AccessToken>,
    @InjectRepository(EmailVerificationToken)
    private emailVerificationTokenRepo: Repository<EmailVerificationToken>,
    private emailService: EmailService,
  ) {
    this.client = new OAuth2Client(
      configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  private async sendVerificationEmail(
    email: string,
    otp: string,
    fullName: string,
  ): Promise<void> {
    try {
      await this.emailService.sendMail({
        to: [{ email, name: fullName }],
        subject: 'Verify Your Email Address',
        templateId: EmailTemplateId.EMAIL_VERIFICATION,
        templateData: {
          userName: fullName,
          otp: otp,
          expirationMinutes: '15',
        },
      });
    } catch (error) {
      console.error(`Failed to send verification email to ${email}:`, error);
      throw error;
    }
  }

  private async sendPasswordResetEmail(
    email: string,
    otp: string,
    fullName: string,
  ): Promise<void> {
    try {
      await this.emailService.sendMail({
        to: [{ email, name: fullName }],
        subject: 'Reset Your Password',
        templateId: EmailTemplateId.PASSWORD_RESET,
        templateData: {
          userName: fullName,
          otp: otp,
          expirationHours: '1',
        },
      });
    } catch (error) {
      console.error(`Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }
  // --- UsersService logic ---
  async create(data: CreateUserDto) {
    const user = this.repo.create(data);
    if (data.password) {
      user.passwordHash = await bcrypt.hash(data.password, 10);
    }
    try {
      return await this.repo.save(user);
    } catch {
      throw new ConflictException('A user with this email already exists.');
    }
  }

  findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async update(id: string, changes: UpdateUserDto) {
    const user = await this.findOne(id);

    // Check for phone number uniqueness if being updated
    if (changes.phoneNumber && changes.phoneNumber !== user.phoneNumber) {
      const existingUserByPhone = await this.findOneByPhoneNumber(
        changes.phoneNumber,
      );
      if (existingUserByPhone) {
        throw new ConflictException(
          'User with this phone number already exists',
        );
      }
    }

    // Prevent updating authProvider via profile update
    const changesWithAuth = changes as UpdateUserDto & {
      authProvider?: string;
    };
    if (
      changesWithAuth.authProvider &&
      (changesWithAuth.authProvider as AuthProvider) !== user.authProvider
    ) {
      throw new BadRequestException(
        'Authentication provider cannot be changed',
      );
    }

    Object.assign(user, changes);
    try {
      return await this.repo.save(user);
    } catch {
      throw new ConflictException('Update failed due to conflicting data.');
    }
  }

  async delete(id: string) {
    // Hard delete: actually remove user from DB
    await this.repo.delete(id);
    return {
      statusCode: 200,
      message: 'User deleted from database',
      data: { timestamp: new Date().toISOString() },
    };
  }

  async findOneByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async findOneByPhoneNumber(phoneNumber: string) {
    return this.repo.findOne({ where: { phoneNumber } });
  }

  // --- AuthService logic ---
  async signup(
    signupDto: SignupUserDto,
  ): Promise<{ user: Partial<User>; tokens: TokenResponseDto }> {
    const { email, password, fullName, phoneNumber } = signupDto;

    // Check for existing user by email
    const existingUserByEmail = await this.findOneByEmail(email);
    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check for existing user by phone number if provided
    if (phoneNumber) {
      const existingUserByPhone = await this.findOneByPhoneNumber(phoneNumber);
      if (existingUserByPhone) {
        throw new ConflictException(
          'User with this phone number already exists',
        );
      }
    }

    const user = await this.create({
      email,
      password,
      fullName,
      phoneNumber,
    });
    const otp = await this.generateEmailVerificationToken(user.id);
    await this.sendVerificationEmail(user.email, otp, user.fullName);
    const tokens = await this.generateTokens(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        authProvider: user.authProvider,
        profilePicture: user.profilePicture,
        phoneNumber: user.phoneNumber,
        about: user.about,
      },
      tokens,
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: Partial<User>; tokens: TokenResponseDto }> {
    const { email, password } = loginDto;
    const user = await this.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email is not verified');
    }

    if (user.authProvider === AuthProvider.EMAIL) {
      if (!user.passwordHash) {
        throw new UnauthorizedException('Invalid authentication method');
      }
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    } else {
      throw new UnauthorizedException(
        'Please use the correct authentication method',
      );
    }
    const tokens = await this.generateTokens(user);
    await this.update(user.id, { lastActiveAt: new Date() } as UpdateUserDto);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        authProvider: user.authProvider,
        profilePicture: user.profilePicture,
        phoneNumber: user.phoneNumber,
        about: user.about,
      },
      tokens,
    };
  }

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payloadBase = {
      sub: user.id,
      email: user.email,
      authProvider: user.authProvider,
    };

    // Determine expirations (in seconds)
    const accessExpiresInStr = this.configService.get<string>('JWT_EXPIRES_IN');
    const refreshExpiresInStr = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    const accessExpiresIn = accessExpiresInStr
      ? parseInt(accessExpiresInStr)
      : 7 * 24 * 60 * 60; // default 7 days
    const refreshExpiresIn = refreshExpiresInStr
      ? parseInt(refreshExpiresInStr)
      : 14 * 24 * 60 * 60; // default 14 days

    // Create a unique identifier for the access token (jti)
    const jti = randomBytes(16).toString('hex');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payloadBase, jti },
        {
          expiresIn: accessExpiresIn,
          secret:
            this.configService.get<string>('JWT_SECRET') || 'fallback-secret',
        },
      ),
      this.jwtService.signAsync(payloadBase, {
        expiresIn: refreshExpiresIn,
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'fallback-refresh-secret',
      }),
    ]);

    // Save access token record
    const accessExpiresAt = new Date(Date.now() + accessExpiresIn * 1000);
    await this.accessTokenRepo.save(
      this.accessTokenRepo.create({
        userId: user.id,
        jti,
        expiresAt: accessExpiresAt,
        revoked: false,
      }),
    );

    // Save refresh token
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000);
    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        token: refreshToken,
        expiresAt: refreshExpiresAt,
        revoked: false,
      }),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      tokenType: 'Bearer',
    };
  }

  async logoutByAccessToken(jti: string, userId: string): Promise<void> {
    const token = await this.accessTokenRepo.findOne({ where: { jti } });
    if (!token || token.revoked) {
      throw new UnauthorizedException('Invalid access token');
    }
    if (token.userId !== userId) {
      throw new UnauthorizedException('Token does not belong to user');
    }
    token.revoked = true;
    await this.accessTokenRepo.save(token);

    // Revoke all refresh tokens for the user for safety
    await this.refreshTokenRepo.update(
      { userId, revoked: false },
      { revoked: true },
    );
  }
  async logout(refreshToken: string): Promise<void> {
    const token = await this.refreshTokenRepo.findOne({
      where: { token: refreshToken },
    });
    if (!token || token.revoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    token.revoked = true;
    await this.refreshTokenRepo.save(token);
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'fallback-refresh-secret',
      });
      const user = await this.findOne(payload.sub);
      if (!user.isActive) {
        throw new UnauthorizedException('User account is deactivated');
      }
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(email: string): Promise<{ token: string }> {
    const user = await this.findOneByEmail(email);
    if (!user) {
      return { token: '' };
    }

    // Generate 6-digit numeric OTP
    const otp = (
      (parseInt(randomBytes(3).toString('hex'), 16) % 900000) +
      100000
    ).toString();

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const resetToken = this.passwordResetTokenRepo.create({
      userId: user.id,
      token: otp,
      expiresAt,
      isUsed: false,
    });
    await this.passwordResetTokenRepo.save(resetToken);

    // Send password reset OTP email
    await this.sendPasswordResetEmail(user.email, otp, user.fullName);

    return { token: otp };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.passwordResetTokenRepo.findOne({
      where: { token, isUsed: false },
      relations: ['user'],
    });
    if (!resetToken) {
      throw new NotFoundException('Invalid or expired reset token');
    }
    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.update(resetToken.user.id, {
      passwordHash: hashedPassword,
    } as UpdateUserDto);
    resetToken.isUsed = true;
    await this.passwordResetTokenRepo.save(resetToken);
  }

  async generateEmailVerificationToken(userId: string): Promise<string> {
    // Invalidate old unverified tokens
    await this.emailVerificationTokenRepo.delete({
      userId,
      verifiedAt: null as unknown as Date,
    });

    // Generate 6-digit OTP
    const otp = (
      (parseInt(randomBytes(3).toString('hex'), 16) % 900000) +
      100000
    ).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const verificationToken = this.emailVerificationTokenRepo.create({
      userId,
      otp,
      expiresAt,
      verifiedAt: null as unknown as Date,
    });

    await this.emailVerificationTokenRepo.save(verificationToken);
    return otp;
  }

  async verifyEmail(email: string, otp: string): Promise<void> {
    const verificationToken = await this.emailVerificationTokenRepo.findOne({
      where: {
        otp,
        verifiedAt: null as unknown as Date,
      },
    });

    if (!verificationToken) {
      throw new NotFoundException('Invalid or already used OTP');
    }

    // Manually fetch the user
    const user = await this.repo.findOne({
      where: { id: verificationToken.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified === true) {
      throw new BadRequestException('Email is already verified');
    }

    // Verify the email matches
    if (user.email !== email) {
      throw new UnauthorizedException('OTP does not match the provided email');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Email verification OTP has expired');
    }

    await this.repo.update(user.id, {
      emailVerified: true,
    });

    verificationToken.verifiedAt = new Date();
    await this.emailVerificationTokenRepo.save(verificationToken);
  }

  async verifyGoogleToken({ idToken }: { idToken: string }) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();

      if (!payload?.email) {
        throw new UnauthorizedException('Google token missing email');
      }

      let user = await this.repo.findOne({ where: { email: payload.email } });

      if (user) {
        if (user.authProvider !== AuthProvider.GOOGLE) {
          throw new UnauthorizedException(
            'This email is registered with password login. Please use email and password.',
          );
        }
      } else {
        user = this.repo.create({
          email: payload.email,
          fullName:
            payload.name ||
            `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
          profilePicture: payload.picture,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: true,
        });
        user = await this.repo.save(user);
      }

      const tokens = await this.generateTokens(user);
      return { user, tokens };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
