import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import appConfig from '../config/auth.config';
import * as SYS_MSG from '../shared/constants/systemMessages';
import { IS_PUBLIC_KEY } from '../shared/helpers/skipAuth';
import { UnauthorizedError } from '../errors/';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublicRoute) {
      return true;
    }

    if (!token) {
      throw new UnauthorizedError(SYS_MSG.UNAUTHENTICATED_MESSAGE);
    }

    let payload: JwtPayload | null = null;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: appConfig().jwtSecret,
      });
    } catch {
      payload = null;
    }

    if (!payload) {
      throw new UnauthorizedError(SYS_MSG.UNAUTHENTICATED_MESSAGE);
    }

    if (this.isExpiredToken(payload)) {
      throw new UnauthorizedError(SYS_MSG.UNAUTHENTICATED_MESSAGE);
    }

    request.user = payload; // Now properly typed because Request was extended

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private isExpiredToken(token: JwtPayload): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return token.exp < currentTime;
  }
}
