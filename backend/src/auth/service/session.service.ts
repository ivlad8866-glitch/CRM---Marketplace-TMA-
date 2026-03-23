import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class SessionService {
  private readonly pepper: string;
  private readonly pepperPrevious: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.pepper = config.getOrThrow<string>('REFRESH_TOKEN_PEPPER');
    this.pepperPrevious = config.get<string>('REFRESH_TOKEN_PEPPER_PREVIOUS');
  }

  generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(token: string, pepper?: string): string {
    return createHash('sha256')
      .update(token + (pepper || this.pepper))
      .digest('hex');
  }

  async createSession(userId: string, refreshToken: string, fingerprint?: string, ua?: string, ip?: string) {
    const hash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hash,
        fingerprint,
        expiresAt,
        userAgent: ua,
        ipAddress: ip,
      },
    });
  }

  async validateAndRotate(refreshToken: string, fingerprint?: string) {
    // Try current pepper
    let hash = this.hashToken(refreshToken);
    let session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    let needsRehash = false;

    // Try previous pepper if current didn't match
    if (!session && this.pepperPrevious) {
      hash = this.hashToken(refreshToken, this.pepperPrevious);
      session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
      needsRehash = !!session;
    }

    if (!session) throw new Error('SESSION_EXPIRED');
    if (session.revokedAt) {
      // Theft detected — revoke all sessions for this user
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new Error('SESSION_REVOKED');
    }
    if (session.expiresAt < new Date()) throw new Error('SESSION_EXPIRED');
    if (fingerprint && session.fingerprint && session.fingerprint !== fingerprint) {
      throw new Error('FINGERPRINT_MISMATCH');
    }

    // Revoke old session
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Generate new refresh token and session
    const newRefreshToken = this.generateRefreshToken();
    const newSession = await this.createSession(
      session.userId,
      newRefreshToken,
      session.fingerprint || undefined,
      session.userAgent || undefined,
      session.ipAddress || undefined,
    );

    return { session: newSession, refreshToken: newRefreshToken, userId: session.userId };
  }

  async revokeSession(refreshTokenHash: string) {
    await this.prisma.session.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revoke session by raw (unhashed) refresh token — handles pepper internally */
  async revokeByRawToken(rawToken: string) {
    // Try current pepper
    let hash = this.hashToken(rawToken);
    let found = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });

    // Try previous pepper
    if (!found && this.pepperPrevious) {
      hash = this.hashToken(rawToken, this.pepperPrevious);
      found = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    }

    if (found && !found.revokedAt) {
      await this.prisma.session.update({
        where: { id: found.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  async revokeAllUserSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
