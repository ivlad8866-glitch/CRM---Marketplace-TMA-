import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly secrets: string[];

  constructor(
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    super();
    const current = config.getOrThrow<string>('JWT_SECRET');
    const previous = config.get<string>('JWT_SECRET_PREVIOUS');
    this.secrets = previous ? [current, previous] : [current];
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('SESSION_EXPIRED');
    }
    const token = authHeader.slice(7);

    // Try each secret (current first, then previous for rotation)
    for (const secret of this.secrets) {
      try {
        const payload = this.jwtService.verify(token, { secret });
        req.user = { userId: payload.sub, role: payload.role, workspaceId: payload.wid };
        return true;
      } catch {
        continue;
      }
    }

    throw new UnauthorizedException('SESSION_EXPIRED');
  }
}
