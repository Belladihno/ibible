import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRole } from '../modules/user/enums/user.enums';
import { UnauthorizedError } from '../errors/';
import * as SYS_MSG from '../shared/constants/systemMessages';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new UnauthorizedError(SYS_MSG.UNAUTHENTICATED_MESSAGE);
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedError('Admin access required');
    }

    return true;
  }
}
