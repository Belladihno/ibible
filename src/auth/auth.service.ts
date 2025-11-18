/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User } from 'src/users/entities/user.entity';
import { AuthProvider } from 'src/users/enums/user.enums';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login-user.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { UserPayload } from './strategy/interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(
    registerDto: CreateUserDto,
  ): Promise<{ user: User; tokens: TokenResponseDto }> {
    const { email, password, fullName = AuthProvider.EMAIL } = registerDto;

    const existingUser = await this.usersService
      .findAll()
      .then((users) => users.find((user) => user.email === email));

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.usersService.create({
      email,
      password,
      fullName,
    });

    const tokens = await this.generateTokens(user);

    return { user, tokens };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: User; tokens: TokenResponseDto }> {
    const { email, password } = loginDto;
    const user = await this.usersService
      .findAll()
      .then((users) => users.find((user) => user.email === email));

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
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

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last active timestamp
    await this.usersService.update(user.id, {
      lastActiveAt: new Date(),
    } as any);

    return { user, tokens };
  }

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      authProvider: user.authProvider,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ||
          '15m') as any,
        secret:
          this.configService.get<string>('JWT_SECRET') || 'fallback-secret',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
          '7d') as any,
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'fallback-refresh-secret',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      tokenType: 'Bearer',
    };
  }

  async validateGoogleUser(userDetails: UserPayload) {
    let user = await this.usersService.findOneByEmail(userDetails.email);

    if (user) {
      if (user.authProvider === AuthProvider.EMAIL) {
        throw new BadRequestException(
          'An account with this email already exists. Please sign in using your email and password.',
        );
      }

      return this.googleSignIn(user);
    } else {
      return this.googleSignUp(userDetails);
    }
  }

  async googleSignIn(userDetails: UserPayload) {
    return {
      msg: `Google signin successful for user: ${userDetails.email}`,
      user: userDetails,
    };
  }

  async googleSignUp(userDetails: UserPayload) {
    const payload = {
      email: userDetails.email,
      fullName: `${userDetails.firstName} ${userDetails.lastName}`,
      profilePicture: userDetails.picture,
      authProvider: AuthProvider.GOOGLE,
    };

    const newUser = await this.usersService.create(payload);
    return {
      msg: `Google signup successful. New user created: ${newUser.email}`,
      user: newUser,
    };
  }
}
