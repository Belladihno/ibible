import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessToken } from 'src/entities/access-token.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(AccessToken)
    private accessTokenRepo: Repository<AccessToken>,
  ) {
    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() as (
        req: Request,
      ) => string | null,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
    };
    super(opts);
  }
  async validate(payload: {
    sub: string;
    email?: string;
    role?: string;
    authProvider?: string;
    jti?: string;
  }) {
    try {
      const jti = payload.jti;
      if (!jti) {
        throw new UnauthorizedException('Missing token identifier');
      }
      const token = await this.accessTokenRepo.findOne({ where: { jti } });
      if (!token || token.revoked) {
        throw new UnauthorizedException('Token has been revoked');
      }
      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        authProvider: payload.authProvider,
        jti,
      };
    } catch (error: unknown) {
      let message: string;
      if (error instanceof Error) {
        message = error.message;
      } else {
        message = 'An unknown error occurred';
      }
      throw new UnauthorizedException(message);
    }
  }
}
