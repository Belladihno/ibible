/* eslint-disable @typescript-eslint/unbound-method */
import { AuthGuard } from '../auth.guard';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AccessToken } from '../../entities/access-token.entity';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { UnauthorizedError } from '../../errors';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;
  let accessTokenRepo: Repository<AccessToken>;

  beforeEach(() => {
    jwtService = new JwtService({ secret: 'test-secret' });
    reflector = new Reflector();
    accessTokenRepo = {
      findOne: jest.fn(),
    } as unknown as Repository<AccessToken>;

    authGuard = new AuthGuard(jwtService, reflector, accessTokenRepo);
  });

  it('should allow access to public routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockExecutionContext();
    const result = await authGuard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if no token is provided', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockExecutionContext();
    context.switchToHttp().getRequest().headers.authorization = undefined;
    await expect(authGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('should throw UnauthorizedException if token is invalid', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest
      .spyOn(jwtService, 'verifyAsync')
      .mockRejectedValue(new Error(SYS_MSG.INVALID_TOKEN));
    const context = createMockExecutionContext();
    context.switchToHttp().getRequest().headers.authorization =
      'Bearer invalid-token';
    await expect(authGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('should throw UnauthorizedException if token is expired', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest
      .spyOn(jwtService, 'verifyAsync')
      .mockResolvedValue({ exp: Math.floor(Date.now() / 1000) - 10 });
    const context = createMockExecutionContext();
    context.switchToHttp().getRequest().headers.authorization =
      'Bearer expired-token';
    await expect(authGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('should allow access if token is valid and user is active', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
      exp: Math.floor(Date.now() / 1000) + 1000,
      sub: 'user-id-123',
      jti: 'token-id-123',
    });

    // Mock the access token repository to return a valid token
    accessTokenRepo.findOne = jest.fn().mockResolvedValue({
      jti: 'token-id-123',
      revoked: false,
    });

    const context = createMockExecutionContext();
    context.switchToHttp().getRequest().headers.authorization =
      'Bearer valid-token';
    const result = await authGuard.canActivate(context);
    expect(result).toBe(true);
    expect(accessTokenRepo.findOne).toHaveBeenCalledWith({
      where: { jti: 'token-id-123' },
    });
  });

  function createMockExecutionContext(): ExecutionContext {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {
            authorization: 'Bearer test-token',
          },
        }),
      }),
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(() => {}),
    } as unknown as ExecutionContext;
  }
});
