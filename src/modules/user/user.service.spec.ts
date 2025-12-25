import { Test, TestingModule } from '@nestjs/testing';
import { UserService, TooManyRequestsException } from './user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { PasswordResetToken } from 'src/entities/password-reset-token.entity';
import { RefreshToken } from 'src/entities/refresh-token.entity';
import { AccessToken } from 'src/entities/access-token.entity';
import { EmailVerificationToken } from 'src/entities/email-verification-token.entity';
import { EmailService } from '../email/email.service';
import { UploadService } from '../upload/upload.service';
import * as bcrypt from 'bcrypt';
import { AuthProvider } from './enums/user.enums';
import { LoginDto } from './dto/login-user.dto';
import { SignupUserDto } from './dto/signup-user.dto';
import { AnalyticsService } from '../analytics/analytics.service';
import { TokenResponseDto } from './dto/token-response.dto';

describe('UserService', () => {
  let service: UserService;
  let repo: Repository<User>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockEmailService = { sendMail: jest.fn() };
  const mockUploadService = { uploadFile: jest.fn() };
  const mockJwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const mockConfigService = { get: jest.fn() };
  const mockAnalyticsService = {
    trackEvent: jest.fn(),
    getSessionDuration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: getRepositoryToken(PasswordResetToken), useValue: mockRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRepo },
        { provide: getRepositoryToken(AccessToken), useValue: mockRepo },
        {
          provide: getRepositoryToken(EmailVerificationToken),
          useValue: mockRepo,
        },
        { provide: EmailService, useValue: mockEmailService },
        { provide: UploadService, useValue: mockUploadService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AnalyticsService, useValue: mockAnalyticsService }, // <-- FIXED
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should create a new user and return tokens', async () => {
      const signupDto: SignupUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        phoneNumber: '08012345678',
      };

      const createdUser: Partial<User> = {
        id: '1',
        email: signupDto.email,
        fullName: signupDto.fullName,
        passwordHash: await bcrypt.hash(signupDto.password, 10),
        authProvider: AuthProvider.EMAIL,
        isActive: true,
        emailVerified: false,
      };

      mockRepo.findOne.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue(createdUser);
      mockRepo.save.mockResolvedValue(createdUser);
      mockEmailService.sendMail.mockResolvedValue(undefined);
      mockJwtService.signAsync.mockResolvedValue('fake-token');

      const result = await service.signup(signupDto);

      expect(result.user.email).toEqual(signupDto.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(mockEmailService.sendMail).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      const user: Partial<User> = {
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        passwordHash: hashedPassword,
        authProvider: AuthProvider.EMAIL,
        isActive: true,
        emailVerified: true,
      };

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password,
      };

      mockRepo.findOne.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('fake-token');

      const result = await service.login(loginDto);

      expect(result.user.email).toEqual(user.email);
      expect(result.tokens.accessToken).toBeDefined();
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const user: Partial<User> = {
        id: '1',
        email: 'test@example.com',
        authProvider: AuthProvider.EMAIL,
      };

      mockJwtService.signAsync.mockResolvedValue('token');

      const tokens = await service['generateTokens'](user as User);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.tokenType).toBe('Bearer');
    });
  });
});
