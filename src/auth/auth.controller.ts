import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { UserPayload } from './strategy/interface';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: Request & { user: UserPayload },
    @Res() res: Response,
  ) {
    const userDetails = req.user;

    const authResult = await this.authService.validateGoogleUser(userDetails);

    const redirectUrl = `${this.configService.get('FRONTEND_URL')}?token=${authResult?.msg}`;

    return res.redirect(redirectUrl);
  }
}
