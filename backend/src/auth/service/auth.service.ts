import { Injectable, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { TelegramVerifyService, TelegramUser } from './telegram-verify.service';
import { SessionService } from './session.service';
import { TelegramAuthDto } from '../dto/telegram-auth.dto';
import { AuthResponse } from '../dto/token-response.dto';
import { computeFingerprint } from '../../common/utils/fingerprint';

@Injectable()
export class AuthService {
  private readonly telegramVerify: TelegramVerifyService;
  private readonly authDateTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {
    this.telegramVerify = new TelegramVerifyService(config.getOrThrow('BOT_TOKEN'));
    this.authDateTtl = Number(config.get('AUTH_DATE_TTL_SECONDS', '300'));
  }

  async authenticateTelegram(dto: TelegramAuthDto, ua?: string, ip?: string): Promise<{ auth: AuthResponse; refreshToken: string }> {
    // Phase 1: Validate initData
    let result;
    try {
      result = this.telegramVerify.verify(dto.initData, this.authDateTtl);
    } catch (e: any) {
      throw new UnauthorizedException(e.message);
    }

    // Anti-replay
    const replayKey = `initdata:${result.hash}`;
    const isNew = await this.redis.set(replayKey, '1', 'EX', this.authDateTtl, 'NX');
    if (!isNew) throw new UnauthorizedException('INIT_DATA_REPLAYED');

    // Phase 2: Resolve startParam
    const startParam = dto.startParam || result.startParam;
    let service = null;
    let workspace = null;

    if (startParam) {
      service = await this.prisma.service.findFirst({
        where: { startParam, isActive: true },
        include: { workspace: true },
      });
      if (!service) throw new NotFoundException('SERVICE_NOT_FOUND');
      workspace = service.workspace;
    }

    // Phase 3: User + role resolution (transaction)
    const txResult = await this.prisma.$transaction(async (tx) => {
      // Upsert user
      const user = await tx.user.upsert({
        where: { telegramId: BigInt(result.user.id) },
        create: {
          telegramId: BigInt(result.user.id),
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          username: result.user.username,
          languageCode: result.user.language_code,
          photoUrl: result.user.photo_url,
          isBot: result.user.is_bot || false,
        },
        update: {
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          username: result.user.username,
          languageCode: result.user.language_code,
          photoUrl: result.user.photo_url,
        },
      });

      if (!workspace) {
        return { user, role: 'CUSTOMER' as const, membership: null, customerProfile: null, ticket: null };
      }

      // Check membership
      const membership = await tx.membership.findUnique({
        where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      });

      if (membership && membership.role !== 'CUSTOMER') {
        // Agent/Admin path
        if (membership.status === 'DEACTIVATED') {
          throw new ForbiddenException('FORBIDDEN');
        }
        if (membership.status === 'INVITED') {
          await tx.membership.update({
            where: { id: membership.id },
            data: { status: 'ACTIVE', joinedAt: new Date() },
          });
        }
        return { user, role: membership.role, membership, customerProfile: null, ticket: null };
      }

      // Customer path
      let customerProfile = await tx.customerProfile.findUnique({
        where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      });

      if (!customerProfile) {
        // Generate client number atomically
        const [counter] = await tx.$queryRaw<{ lastValue: number }[]>`
          SELECT "lastValue" FROM "WorkspaceCounter"
          WHERE "workspaceId" = ${workspace.id} AND "counterType" = 'client'
          FOR UPDATE
        `;
        const nextClient = (counter?.lastValue ?? 0) + 1;
        await tx.$queryRaw`
          UPDATE "WorkspaceCounter" SET "lastValue" = ${nextClient}
          WHERE "workspaceId" = ${workspace.id} AND "counterType" = 'client'
        `;
        const clientNumber = `C-${String(nextClient).padStart(6, '0')}`;

        customerProfile = await tx.customerProfile.create({
          data: { userId: user.id, workspaceId: workspace.id, clientNumber },
        });

        // Create customer membership
        await tx.membership.upsert({
          where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
          create: { userId: user.id, workspaceId: workspace.id, role: 'CUSTOMER', status: 'ACTIVE', joinedAt: new Date() },
          update: {},
        });
      }

      // Find or create ticket
      let ticket = await tx.ticket.findFirst({
        where: {
          customerId: customerProfile.id,
          serviceId: service!.id,
          status: { notIn: ['CLOSED', 'SPAM', 'DUPLICATE'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!ticket) {
        const [tCounter] = await tx.$queryRaw<{ lastValue: number }[]>`
          SELECT "lastValue" FROM "WorkspaceCounter"
          WHERE "workspaceId" = ${workspace.id} AND "counterType" = 'ticket'
          FOR UPDATE
        `;
        const nextTicket = (tCounter?.lastValue ?? 0) + 1;
        await tx.$queryRaw`
          UPDATE "WorkspaceCounter" SET "lastValue" = ${nextTicket}
          WHERE "workspaceId" = ${workspace.id} AND "counterType" = 'ticket'
        `;
        const year = new Date().getFullYear();
        const ticketNumber = `T-${year}-${String(nextTicket).padStart(6, '0')}`;

        ticket = await tx.ticket.create({
          data: {
            workspaceId: workspace.id,
            serviceId: service!.id,
            customerId: customerProfile.id,
            ticketNumber,
            slaDeadline: new Date(Date.now() + service!.slaMinutes * 60 * 1000),
          },
        });
      }

      return { user, role: 'CUSTOMER' as const, membership: null, customerProfile, ticket };
    });

    // Phase 4: Session
    const fingerprint = computeFingerprint(ua, ip);

    const accessToken = this.jwt.sign({
      sub: txResult.user.id,
      role: txResult.role,
      wid: workspace?.id,
    });

    const refreshToken = this.sessions.generateRefreshToken();
    await this.sessions.createSession(txResult.user.id, refreshToken, fingerprint, ua, ip);

    const auth: AuthResponse = {
      accessToken,
      user: {
        id: txResult.user.id,
        telegramId: txResult.user.telegramId.toString(),
        username: txResult.user.username,
        firstName: txResult.user.firstName,
        lastName: txResult.user.lastName,
        languageCode: txResult.user.languageCode,
        photoUrl: txResult.user.photoUrl,
        createdAt: txResult.user.createdAt.toISOString(),
      },
      workspace: workspace ? {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        botUsername: workspace.botUsername,
        brandConfig: workspace.brandConfig as Record<string, unknown>,
        slaDefaults: workspace.slaDefaults as Record<string, number>,
        createdAt: workspace.createdAt.toISOString(),
      } : null,
      service: service ? {
        id: service.id,
        name: service.name,
        description: service.description,
        startParam: service.startParam,
        slaMinutes: service.slaMinutes,
        isActive: service.isActive,
        routingMode: service.routingMode,
        version: service.version,
        links: {
          main: `t.me/${workspace?.botUsername}?startapp=${service.startParam}`,
          compact: `t.me/${workspace?.botUsername}?startapp=${service.startParam}&mode=compact`,
        },
      } : null,
      clientNumber: txResult.customerProfile?.clientNumber ?? null,
      ticketNumber: txResult.ticket?.ticketNumber ?? null,
      role: txResult.role,
    };

    return { auth, refreshToken };
  }

  /** Generate a fresh access token for an existing user (used by refresh endpoint) */
  async generateAccessTokenForUser(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Find the user's active membership to determine role and workspace
    const membership = await this.prisma.membership.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    return this.jwt.sign({
      sub: user.id,
      role: membership?.role || 'CUSTOMER',
      wid: membership?.workspaceId,
    });
  }
}
