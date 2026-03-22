import { Controller, Post, Body, Req, Res, UseGuards, HttpCode } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../service/auth.service';
import { SessionService } from '../service/session.service';
import { telegramAuthSchema } from '../dto/telegram-auth.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { computeFingerprint } from '../../common/utils/fingerprint';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('telegram')
  async telegram(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const dto = telegramAuthSchema.parse(body);
    const ua = req.headers['user-agent'];
    const ip = req.ip;
    const { auth, refreshToken } = await this.auth.authenticateTelegram(dto, ua, ip);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return res.json(auth);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ code: 'SESSION_EXPIRED' });

    const fingerprint = computeFingerprint(req.headers['user-agent'], req.ip);

    try {
      const result = await this.sessions.validateAndRotate(token, fingerprint);
      const accessToken = await this.auth.generateAccessTokenForUser(result.userId);

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      return res.json({ accessToken });
    } catch (e: any) {
      return res.status(401).json({ code: e.message });
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.refreshToken;
    if (token) {
      await this.sessions.revokeByRawToken(token);
    }
    res.clearCookie('refreshToken', { path: '/api' });
    return res.send();
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logoutAll(@Req() req: any, @Res() res: Response) {
    await this.sessions.revokeAllUserSessions(req.user.userId);
    res.clearCookie('refreshToken', { path: '/api' });
    return res.send();
  }

  /**
   * DEV ONLY — login as a seeded user without Telegram initData.
   * Body: { "telegramId": 100000001 } (admin), 100000002 (agent), 100000003 (customer)
   */
  @Post('dev-login')
  async devLogin(@Body() body: { telegramId: number }, @Req() req: Request, @Res() res: Response) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: 'Not found' });
    }

    const { auth, refreshToken } = await this.auth.devLogin(
      BigInt(body.telegramId),
      req.headers['user-agent'],
      req.ip,
    );

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return res.json(auth);
  }
}
