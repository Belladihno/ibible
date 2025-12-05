import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authGuard: AuthGuard) {}

  async canActivate(context: ExecutionContext) {
    try {
      await this.authGuard.canActivate(context);
    } catch (e) {
      console.error(e);
    }
    return true;
  }
}
