import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(`JWT auth failed: err=${err?.message}, info=${info?.message || info}`);
      throw new UnauthorizedException('SESSION_EXPIRED');
    }
    return user;
  }
}
