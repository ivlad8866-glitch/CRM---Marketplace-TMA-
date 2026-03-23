import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

// ---------------------------------------------------------------------------
// Helpers — build a valid Telegram initData string with a real HMAC signature
// so TelegramVerifyService tests can work without mocking Node crypto.
// ---------------------------------------------------------------------------
import { createHmac } from 'crypto';

const BOT_TOKEN = 'test-bot-token-1234567890';

function buildInitData(
  overrides: Partial<{
    userId: number;
    authDate: number;
    hash: string;
    firstName: string;
  }> = {},
): string {
  const userId = overrides.userId ?? 123456789;
  const authDate = overrides.authDate ?? Math.floor(Date.now() / 1000);
  const firstName = overrides.firstName ?? 'Test';
  const userJson = JSON.stringify({ id: userId, first_name: firstName });

  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const entries = [`auth_date=${authDate}`, `user=${userJson}`].sort();
  const dataCheckString = entries.join('\n');
  const computedHash =
    overrides.hash ??
    createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const params = new URLSearchParams({
    auth_date: String(authDate),
    user: userJson,
    hash: computedHash,
  });
  return params.toString();
}

// ---------------------------------------------------------------------------
// TelegramVerifyService — pure unit tests (no DI needed, class is plain)
// ---------------------------------------------------------------------------
import { TelegramVerifyService } from './telegram-verify.service';

describe('TelegramVerifyService', () => {
  let service: TelegramVerifyService;

  beforeEach(() => {
    service = new TelegramVerifyService(BOT_TOKEN);
  });

  describe('verify()', () => {
    it('returns VerifyResult for valid initData within TTL', () => {
      const initData = buildInitData();
      const result = service.verify(initData, 300);

      expect(result.user.id).toBe(123456789);
      expect(result.user.first_name).toBe('Test');
      expect(typeof result.authDate).toBe('number');
      expect(typeof result.hash).toBe('string');
    });

    it('throws INVALID_INIT_DATA when hash is missing', () => {
      const params = new URLSearchParams({
        auth_date: String(Math.floor(Date.now() / 1000)),
        user: JSON.stringify({ id: 1, first_name: 'X' }),
        // no hash key
      });
      expect(() => service.verify(params.toString(), 300)).toThrow('INVALID_INIT_DATA');
    });

    it('throws INVALID_INIT_DATA when hash has been tampered with', () => {
      const initData = buildInitData({ hash: 'a'.repeat(64) });
      expect(() => service.verify(initData, 300)).toThrow('INVALID_INIT_DATA');
    });

    it('throws INVALID_INIT_DATA when a field value is tampered but hash is original', () => {
      // Build valid initData, then change the user object without updating hash
      const validInitData = buildInitData();
      const params = new URLSearchParams(validInitData);
      // Replace first_name — the HMAC will no longer match
      params.set('user', JSON.stringify({ id: 123456789, first_name: 'Hacker' }));
      expect(() => service.verify(params.toString(), 300)).toThrow('INVALID_INIT_DATA');
    });

    it('throws INIT_DATA_EXPIRED when auth_date is older than TTL', () => {
      // auth_date 10 minutes ago, TTL is 5 minutes → expired
      const staleAuthDate = Math.floor(Date.now() / 1000) - 600;
      const initData = buildInitData({ authDate: staleAuthDate });
      expect(() => service.verify(initData, 300)).toThrow('INIT_DATA_EXPIRED');
    });

    it('throws INVALID_INIT_DATA when auth_date is far in the future (> 60s tolerance)', () => {
      const futureAuthDate = Math.floor(Date.now() / 1000) + 120;
      const initData = buildInitData({ authDate: futureAuthDate });
      expect(() => service.verify(initData, 300)).toThrow('INVALID_INIT_DATA');
    });

    it('accepts auth_date within the forward 60-second tolerance window', () => {
      // 30 seconds in the future — inside tolerance
      const nearFutureAuthDate = Math.floor(Date.now() / 1000) + 30;
      const initData = buildInitData({ authDate: nearFutureAuthDate });
      const result = service.verify(initData, 300);
      expect(result.user.id).toBe(123456789);
    });

    it('throws INVALID_INIT_DATA when user field is missing', () => {
      // Build a valid signature without the user field so it fails at JSON parse
      const authDate = Math.floor(Date.now() / 1000);
      const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
      const entries = [`auth_date=${authDate}`].sort();
      const hash = createHmac('sha256', secretKey).update(entries.join('\n')).digest('hex');
      const params = new URLSearchParams({ auth_date: String(authDate), hash });
      expect(() => service.verify(params.toString(), 300)).toThrow('INVALID_INIT_DATA');
    });

    it('exposes startParam when present in initData', () => {
      const authDate = Math.floor(Date.now() / 1000);
      const userId = 123456789;
      const firstName = 'Test';
      const startParam = 'svc_abc123';
      const userJson = JSON.stringify({ id: userId, first_name: firstName });

      const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
      const entries = [
        `auth_date=${authDate}`,
        `start_param=${startParam}`,
        `user=${userJson}`,
      ].sort();
      const hash = createHmac('sha256', secretKey).update(entries.join('\n')).digest('hex');

      const params = new URLSearchParams({
        auth_date: String(authDate),
        start_param: startParam,
        user: userJson,
        hash,
      });

      const result = service.verify(params.toString(), 300);
      expect(result.startParam).toBe(startParam);
    });
  });
});

// ---------------------------------------------------------------------------
// AuthService — unit tests with all dependencies mocked
// ---------------------------------------------------------------------------
describe('AuthService', () => {
  let authService: AuthService;

  // Mock implementations
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedis = {
    set: jest.fn(),
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mocked.jwt.token'),
  };

  const mockSessions = {
    generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token-hex'),
    createSession: jest.fn().mockResolvedValue({ id: 'session-id-1' }),
  };

  const mockConfig = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'BOT_TOKEN') return BOT_TOKEN;
      throw new Error(`Unknown config key: ${key}`);
    }),
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'AUTH_DATE_TTL_SECONDS') return '300';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: JwtService, useValue: mockJwt },
        { provide: SessionService, useValue: mockSessions },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  // -------------------------------------------------------------------------
  // devLogin
  // -------------------------------------------------------------------------
  describe('devLogin()', () => {
    const mockUser = {
      id: 'user-uuid-001',
      telegramId: BigInt(123456789),
      firstName: 'Alice',
      lastName: 'Smith',
      username: 'alice',
      languageCode: 'en',
      photoUrl: null,
      isBot: false,
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
    };

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        authService.devLogin(BigInt(999999999)),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with message USER_NOT_FOUND', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        authService.devLogin(BigInt(999999999)),
      ).rejects.toThrow('USER_NOT_FOUND');
    });

    it('returns auth response and refreshToken for existing user without membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(null);

      const result = await authService.devLogin(BigInt(123456789));

      expect(result).toHaveProperty('auth');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token-hex');
    });

    it('auth.user shape matches UserResponse contract', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(null);

      const { auth } = await authService.devLogin(BigInt(123456789));

      expect(auth.user).toMatchObject({
        id: 'user-uuid-001',
        telegramId: '123456789',
        firstName: 'Alice',
        lastName: 'Smith',
        username: 'alice',
        languageCode: 'en',
        photoUrl: null,
      });
      // createdAt must be an ISO string
      expect(typeof auth.user.createdAt).toBe('string');
      expect(() => new Date(auth.user.createdAt)).not.toThrow();
    });

    it('sets role to CUSTOMER when there is no active membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(null);

      const { auth } = await authService.devLogin(BigInt(123456789));

      expect(auth.role).toBe('CUSTOMER');
      expect(auth.workspace).toBeNull();
      expect(auth.service).toBeNull();
      expect(auth.clientNumber).toBeNull();
      expect(auth.ticketNumber).toBeNull();
    });

    it('sets role and workspace from active membership when present', async () => {
      const mockWorkspace = {
        id: 'ws-001',
        name: 'Acme Support',
        slug: 'acme',
        botUsername: 'acme_bot',
        brandConfig: {},
        slaDefaults: {},
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      };
      const mockMembership = {
        id: 'mem-001',
        role: 'AGENT',
        status: 'ACTIVE',
        workspaceId: 'ws-001',
        workspace: mockWorkspace,
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(mockMembership);

      const { auth } = await authService.devLogin(BigInt(123456789));

      expect(auth.role).toBe('AGENT');
      expect(auth.workspace).not.toBeNull();
      expect(auth.workspace!.id).toBe('ws-001');
      expect(auth.workspace!.name).toBe('Acme Support');
    });

    it('calls sessions.createSession with the user id', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(null);

      await authService.devLogin(BigInt(123456789));

      expect(mockSessions.createSession).toHaveBeenCalledTimes(1);
      // computeFingerprint returns undefined when ua/ip are not supplied
      expect(mockSessions.createSession).toHaveBeenCalledWith(
        mockUser.id,
        'mock-refresh-token-hex',
        undefined,
        undefined,
        undefined,
      );
    });

    it('passes ua and ip to sessions.createSession', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(null);

      await authService.devLogin(BigInt(123456789), 'Mozilla/5.0', '127.0.0.1');

      expect(mockSessions.createSession).toHaveBeenCalledWith(
        mockUser.id,
        'mock-refresh-token-hex',
        expect.any(String), // fingerprint is a sha256 hex string
        'Mozilla/5.0',
        '127.0.0.1',
      );
    });

    it('includes an accessToken in the auth response', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(null);

      const { auth } = await authService.devLogin(BigInt(123456789));

      expect(auth.accessToken).toBe('mocked.jwt.token');
    });

    it('signs JWT with sub, role, and wid payload', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(null);

      await authService.devLogin(BigInt(123456789));

      expect(mockJwt.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        role: 'CUSTOMER',
        wid: undefined,
      });
    });
  });

  // -------------------------------------------------------------------------
  // generateAccessTokenForUser
  // -------------------------------------------------------------------------
  describe('generateAccessTokenForUser()', () => {
    const mockUser = {
      id: 'user-uuid-002',
      telegramId: BigInt(987654321),
      firstName: 'Bob',
      lastName: null,
      username: 'bob_tg',
      languageCode: 'ru',
      photoUrl: null,
      isBot: false,
      createdAt: new Date(),
    };

    it('returns the signed JWT string', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(null);

      const token = await authService.generateAccessTokenForUser('user-uuid-002');

      expect(token).toBe('mocked.jwt.token');
    });

    it('signs with CUSTOMER role when no active membership exists', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(null);

      await authService.generateAccessTokenForUser('user-uuid-002');

      expect(mockJwt.sign).toHaveBeenCalledWith({
        sub: 'user-uuid-002',
        role: 'CUSTOMER',
        wid: undefined,
      });
    });

    it('signs with membership role and workspaceId when membership exists', async () => {
      const mockMembership = {
        id: 'mem-002',
        role: 'ADMIN',
        status: 'ACTIVE',
        workspaceId: 'ws-002',
        createdAt: new Date(),
      };

      mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(mockMembership);

      await authService.generateAccessTokenForUser('user-uuid-002');

      expect(mockJwt.sign).toHaveBeenCalledWith({
        sub: 'user-uuid-002',
        role: 'ADMIN',
        wid: 'ws-002',
      });
    });

    it('queries membership ordered by createdAt desc to pick the latest', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce(mockUser);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(null);

      await authService.generateAccessTokenForUser('user-uuid-002');

      expect(mockPrisma.membership.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-uuid-002', status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('propagates the error when user is not found (findUniqueOrThrow rejects)', async () => {
      const notFoundError = new Error('No User found');
      mockPrisma.user.findUniqueOrThrow.mockRejectedValueOnce(notFoundError);

      await expect(
        authService.generateAccessTokenForUser('nonexistent-id'),
      ).rejects.toThrow('No User found');
    });
  });
});
