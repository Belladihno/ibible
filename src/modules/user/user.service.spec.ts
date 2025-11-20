/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { PasswordResetToken } from 'src/entities/password-reset-token.entity';
import { RefreshToken } from 'src/entities/refresh-token.entity';
import { AccessToken } from 'src/entities/access-token.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EmailVerificationToken } from 'src/entities/email-verification-token.entity';
import { EmailService } from '../email/email.service';
import { AuthProvider } from './enums/user.enums';
jest.mock('bcrypt');

import * as bcrypt from 'bcrypt';

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let emailService: jest.Mocked<EmailService>;
  let passwordResetTokenRepo: jest.Mocked<Repository<PasswordResetToken>>;
  let refreshTokenRepo: jest.Mocked<Repository<RefreshToken>>;
  let accessTokenRepo: jest.Mocked<Repository<AccessToken>>;
  let emailVerificationTokenRepo: jest.Mocked<
    Repository<EmailVerificationToken>
  >;

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    fullName: 'Test User',
    passwordHash: 'hashedpassword',
    authProvider: AuthProvider.EMAIL,
    isActive: true,
    emailVerified: false,
    profilePicture: null,
    phoneNumber: null,
    googleId: null,
    appleId: null,
    subscriptionTier: null,
    subscriptionStatus: null,
    subscriptionStartedAt: null,
    subscriptionExpiresAt: null,
    trialEndsAt: null,
    subscriptionEndsAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    preferredLanguage: null,
    preferredBibleVersion: null,
    lastActiveAt: new Date(),
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const mockUserRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockEmailService = {
      sendMail: jest.fn(),
    };

    const mockPasswordResetTokenRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockRefreshTokenRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    

    const mockAccessTokenRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockEmailVerificationTokenRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockPasswordResetTokenRepo,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepo,
        },
        {
          provide: getRepositoryToken(AccessToken),
          useValue: mockAccessTokenRepo,
        },
        {
          provide: getRepositoryToken(EmailVerificationToken),
          useValue: mockEmailVerificationTokenRepo,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    emailService = module.get(EmailService);
    passwordResetTokenRepo = module.get(getRepositoryToken(PasswordResetToken));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    accessTokenRepo = module.get(getRepositoryToken(AccessToken));
    emailVerificationTokenRepo = module.get(
      getRepositoryToken(EmailVerificationToken),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.create(createUserDto as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(userRepo.create).toHaveBeenCalledWith(createUserDto);
      expect(userRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockRejectedValue({
        code: '23505',
        detail: 'Key (email)=(test@example.com) already exists',
      });

      await expect(service.create(createUserDto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('123');

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: '123' } });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('register', () => {
    it('should register a new user and send verification email', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      };

      userRepo.findOne.mockResolvedValue(null); // No existing user
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      configService.get.mockReturnValue('900');
      jwtService.signAsync.mockResolvedValue('mock-token');

      accessTokenRepo.create.mockReturnValue({} as any);
      accessTokenRepo.save.mockResolvedValue({} as any);
      refreshTokenRepo.create.mockReturnValue({} as any);
      refreshTokenRepo.save.mockResolvedValue({} as any);

      emailVerificationTokenRepo.delete.mockResolvedValue({} as any);
      emailVerificationTokenRepo.create.mockReturnValue({} as any);
      emailVerificationTokenRepo.save.mockResolvedValue({} as any);
      emailService.sendMail.mockResolvedValue({ success: true } as any);

      const result = await service.register(registerDto as any);

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(emailVerificationTokenRepo.delete).toHaveBeenCalled();
      expect(emailVerificationTokenRepo.save).toHaveBeenCalled();
      expect(emailService.sendMail).toHaveBeenCalled();
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens).toHaveProperty('accessToken');
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
      };

      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      configService.get.mockReturnValue('900');
      jwtService.signAsync.mockResolvedValue('mock-token');

      accessTokenRepo.create.mockReturnValue({} as any);
      accessTokenRepo.save.mockResolvedValue({} as any);
      refreshTokenRepo.create.mockReturnValue({} as any);
      refreshTokenRepo.save.mockResolvedValue({} as any);
      userRepo.update.mockResolvedValue({} as any);

      const result = await service.login(loginDto);

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for deactivated account', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const deactivatedUser = { ...mockUser, isActive: false };
      userRepo.findOne.mockResolvedValue(deactivatedUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Email Verification', () => {
    describe('generateEmailVerificationToken', () => {
      it('should delete old unverified tokens before generating new one', async () => {
        const userId = '123';
        const mockToken = {
          userId,
          otp: '123456',
          expiresAt: new Date(),
          verifiedAt: null,
        };

        emailVerificationTokenRepo.delete.mockResolvedValue({} as any);
        emailVerificationTokenRepo.create.mockReturnValue(mockToken as any);
        emailVerificationTokenRepo.save.mockResolvedValue(mockToken as any);

        await service.generateEmailVerificationToken(userId);

        expect(emailVerificationTokenRepo.delete).toHaveBeenCalledWith({
          userId,
          verifiedAt: null,
        });
      });

      it('should generate a 6-digit OTP', async () => {
        const userId = '123';
        const mockToken = {
          userId,
          otp: '123456',
          expiresAt: new Date(),
          verifiedAt: null,
        };

        emailVerificationTokenRepo.delete.mockResolvedValue({} as any);
        emailVerificationTokenRepo.create.mockReturnValue(mockToken as any);
        emailVerificationTokenRepo.save.mockResolvedValue(mockToken as any);

        const result = await service.generateEmailVerificationToken(userId);

        expect(result).toMatch(/^\d{6}$/); // Must be exactly 6 digits
        expect(result.length).toBe(6);
      });

      it('should set expiration to 15 minutes', async () => {
        const userId = '123';
        let savedToken: any;

        emailVerificationTokenRepo.delete.mockResolvedValue({} as any);
        emailVerificationTokenRepo.create.mockImplementation((token) => {
          savedToken = token;
          return token as any;
        });
        emailVerificationTokenRepo.save.mockResolvedValue({} as any);

        await service.generateEmailVerificationToken(userId);

        const now = Date.now();
        const expiresAt = savedToken.expiresAt.getTime();
        const fifteenMinutes = 15 * 60 * 1000;

        // Check if expiration is approximately 15 minutes from now (within 1 second tolerance)
        expect(expiresAt - now).toBeGreaterThanOrEqual(fifteenMinutes - 1000);
        expect(expiresAt - now).toBeLessThanOrEqual(fifteenMinutes + 1000);
      });

      it('should save the OTP token to database', async () => {
        const userId = '123';

        emailVerificationTokenRepo.delete.mockResolvedValue({} as any);
        emailVerificationTokenRepo.create.mockReturnValue({} as any);
        emailVerificationTokenRepo.save.mockResolvedValue({} as any);

        await service.generateEmailVerificationToken(userId);

        expect(emailVerificationTokenRepo.save).toHaveBeenCalled();
      });
    });

    describe('verifyEmail', () => {
      it('should successfully verify email with valid OTP and matching email', async () => {
        const email = 'test@example.com';
        const otp = '123456';
        const mockToken = {
          userId: '123',
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min in future
          verifiedAt: null,
        };

        emailVerificationTokenRepo.findOne.mockResolvedValue(mockToken as any);
        userRepo.findOne.mockResolvedValue(mockUser);
        userRepo.update.mockResolvedValue({} as any);
        emailVerificationTokenRepo.save.mockResolvedValue({} as any);

        await service.verifyEmail(email, otp);

        expect(emailVerificationTokenRepo.findOne).toHaveBeenCalledWith({
          where: { otp, verifiedAt: null },
        });
        expect(userRepo.findOne).toHaveBeenCalledWith({
          where: { id: mockToken.userId },
        });
        expect(userRepo.update).toHaveBeenCalledWith(mockUser.id, {
          emailVerified: true,
        });
        expect(emailVerificationTokenRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            verifiedAt: expect.any(Date),
          }),
        );
      });

      it('should throw NotFoundException when OTP does not exist', async () => {
        const email = 'test@example.com';
        const otp = '000000';

        emailVerificationTokenRepo.findOne.mockResolvedValue(null);

        await expect(service.verifyEmail(email, otp)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.verifyEmail(email, otp)).rejects.toThrow(
          'Invalid or already used OTP',
        );
      });

      it('should throw NotFoundException when OTP is already used', async () => {
        const email = 'test@example.com';
        const otp = '123456';

        // Token with verifiedAt set (already used)
        emailVerificationTokenRepo.findOne.mockResolvedValue(null);

        await expect(service.verifyEmail(email, otp)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw NotFoundException when user not found', async () => {
        const email = 'test@example.com';
        const otp = '123456';
        const mockToken = {
          userId: '123',
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          verifiedAt: null,
        };

        emailVerificationTokenRepo.findOne.mockResolvedValue(mockToken as any);
        userRepo.findOne.mockResolvedValue(null); // User not found

        await expect(service.verifyEmail(email, otp)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.verifyEmail(email, otp)).rejects.toThrow(
          'User not found',
        );
      });

      it('should throw UnauthorizedException when email does not match', async () => {
        const wrongEmail = 'wrong@example.com';
        const otp = '123456';
        const mockToken = {
          userId: '123',
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          verifiedAt: null,
        };

        emailVerificationTokenRepo.findOne.mockResolvedValue(mockToken as any);
        userRepo.findOne.mockResolvedValue(mockUser); // mockUser has email: test@example.com

        await expect(service.verifyEmail(wrongEmail, otp)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.verifyEmail(wrongEmail, otp)).rejects.toThrow(
          'OTP does not match the provided email',
        );
      });

      it('should throw BadRequestException when OTP is expired', async () => {
        const email = 'test@example.com';
        const otp = '123456';
        const mockToken = {
          userId: '123',
          otp,
          expiresAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min in past (expired)
          verifiedAt: null,
        };

        emailVerificationTokenRepo.findOne.mockResolvedValue(mockToken as any);
        userRepo.findOne.mockResolvedValue(mockUser);

        await expect(service.verifyEmail(email, otp)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.verifyEmail(email, otp)).rejects.toThrow(
          'Email verification OTP has expired',
        );
      });

      it('should mark token as verified after successful verification', async () => {
        const email = 'test@example.com';
        const otp = '123456';
        const mockToken = {
          userId: '123',
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          verifiedAt: null,
        };

        emailVerificationTokenRepo.findOne.mockResolvedValue(mockToken as any);
        userRepo.findOne.mockResolvedValue(mockUser);
        userRepo.update.mockResolvedValue({} as any);
        emailVerificationTokenRepo.save.mockResolvedValue({} as any);

        await service.verifyEmail(email, otp);

        expect(emailVerificationTokenRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            verifiedAt: expect.any(Date),
          }),
        );
      });

      it('should update user emailVerified field to true', async () => {
        const email = 'test@example.com';
        const otp = '123456';
        const mockToken = {
          userId: '123',
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          verifiedAt: null,
        };

        emailVerificationTokenRepo.findOne.mockResolvedValue(mockToken as any);
        userRepo.findOne.mockResolvedValue(mockUser);
        userRepo.update.mockResolvedValue({} as any);
        emailVerificationTokenRepo.save.mockResolvedValue({} as any);

        await service.verifyEmail(email, otp);

        expect(userRepo.update).toHaveBeenCalledWith(mockUser.id, {
          emailVerified: true,
        });
      });
    });
  });

  describe('forgotPassword', () => {
    it('should generate password reset token for existing user', async () => {
      const email = 'test@example.com';
      const mockResetToken = {
        userId: mockUser.id,
        token: 'reset-token',
        expiresAt: new Date(),
      };

      userRepo.findOne.mockResolvedValue(mockUser);
      passwordResetTokenRepo.create.mockReturnValue(mockResetToken as any);
      passwordResetTokenRepo.save.mockResolvedValue(mockResetToken as any);

      const result = await service.forgotPassword(email);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(passwordResetTokenRepo.save).toHaveBeenCalled();
      expect(result.token).toBeTruthy();
    });

    it('should return empty token for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result.token).toBe('');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const token = 'valid-token';
      const newPassword = 'newpassword123';
      const mockResetToken = {
        token,
        userId: '123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isUsed: false,
        user: mockUser,
      };

      passwordResetTokenRepo.findOne.mockResolvedValue(mockResetToken as any);
      userRepo.findOne.mockResolvedValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashedpassword');
      passwordResetTokenRepo.save.mockResolvedValue(mockResetToken as any);

      await service.resetPassword(token, newPassword);

      expect(passwordResetTokenRepo.findOne).toHaveBeenCalledWith({
        where: { token, isUsed: false },
        relations: ['user'],
      });
      expect(userRepo.save).toHaveBeenCalled();
      expect(passwordResetTokenRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid token', async () => {
      passwordResetTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.resetPassword('invalid', 'newpass')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const mockResetToken = {
        token: 'expired-token',
        userId: '123',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // expired
        isUsed: false,
        user: mockUser,
      };

      passwordResetTokenRepo.findOne.mockResolvedValue(mockResetToken as any);

      await expect(
        service.resetPassword('expired-token', 'newpass'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockToken = {
        token: refreshToken,
        userId: '123',
        revoked: false,
      };

      refreshTokenRepo.findOne.mockResolvedValue(mockToken as any);
      refreshTokenRepo.save.mockResolvedValue({
        ...mockToken,
        revoked: true,
      } as any);

      await service.logout(refreshToken);

      expect(refreshTokenRepo.findOne).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true }),
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.logout('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: '123', email: 'test@example.com' };

      jwtService.verifyAsync.mockResolvedValue(payload);
      userRepo.findOne.mockResolvedValue(mockUser);
      configService.get.mockReturnValue('900');
      jwtService.signAsync.mockResolvedValue('new-token');

      accessTokenRepo.create.mockReturnValue({} as any);
      accessTokenRepo.save.mockResolvedValue({} as any);
      refreshTokenRepo.create.mockReturnValue({} as any);
      refreshTokenRepo.save.mockResolvedValue({} as any);

      const result = await service.refreshToken(refreshToken);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        refreshToken,
        expect.any(Object),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
