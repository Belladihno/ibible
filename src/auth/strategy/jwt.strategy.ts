import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from './interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.sub).catch(() => {
      throw new UnauthorizedException('User not found');
    });

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await this.usersService.update(user.id, {
      lastActiveAt: new Date(),
    } as any);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      authProvider: user.authProvider,
    };
  }
}
