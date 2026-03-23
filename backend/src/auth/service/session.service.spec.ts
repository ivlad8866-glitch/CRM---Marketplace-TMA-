import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TEST_PEPPER = 'test-pepper-secret';
const TEST_PEPPER_PREVIOUS = 'old-pepper-secret';

function hashWith(token: string, pepper: string): string {
  return createHash('sha256').update(token + pepper).digest('hex');
}

// ---------------------------------------------------------------------------
// SessionService
// ---------------------------------------------------------------------------
describe('SessionService', () => {
  let service: SessionService;

  const mockPrisma = {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockConfig = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'REFRESH_TOKEN_PEPPER') return TEST_PEPPER;
      throw new Error(`Unknown required config: ${key}`);
    }),
    get: jest.fn((key: string) => {
      if (key === 'REFRESH_TOKEN_PEPPER_PREVIOUS') return TEST_PEPPER_PREVIOUS;
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  // -------------------------------------------------------------------------
  // generateRefreshToken
  // -------------------------------------------------------------------------
  describe('generateRefreshToken()', () => {
    it('returns a 64-character lowercase hex string', () => {
      const token = service.generateRefreshToken();
      expect(typeof token).toBe('string');
      // randomBytes(32).toString('hex') always produces 64 hex chars
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns a different token on each call (no determinism)', () => {
      const t1 = service.generateRefreshToken();
      const t2 = service.generateRefreshToken();
      expect(t1).not.toBe(t2);
    });
  });

  // -------------------------------------------------------------------------
  // hashToken
  // -------------------------------------------------------------------------
  describe('hashToken()', () => {
    it('produces a deterministic 64-char hex hash using the current pepper', () => {
      const token = 'some-raw-token';
      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces the same hash as manual sha256(token + pepper)', () => {
      const token = 'deterministic-token';
      const expected = hashWith(token, TEST_PEPPER);
      expect(service.hashToken(token)).toBe(expected);
    });

    it('uses provided pepper override instead of the current one', () => {
      const token = 'another-token';
      const expected = hashWith(token, TEST_PEPPER_PREVIOUS);
      expect(service.hashToken(token, TEST_PEPPER_PREVIOUS)).toBe(expected);
    });
  });

  // -------------------------------------------------------------------------
  // createSession
  // -------------------------------------------------------------------------
  describe('createSession()', () => {
    it('calls prisma.session.create once', async () => {
      mockPrisma.session.create.mockResolvedValueOnce({ id: 'sess-1' });
      await service.createSession('user-001', 'raw-token-abc');
      expect(mockPrisma.session.create).toHaveBeenCalledTimes(1);
    });

    it('stores the hashed token, not the raw token', async () => {
      const rawToken = 'raw-refresh-token-xyz';
      const expectedHash = hashWith(rawToken, TEST_PEPPER);

      mockPrisma.session.create.mockResolvedValueOnce({ id: 'sess-2' });
      await service.createSession('user-001', rawToken);

      const callArg = mockPrisma.session.create.mock.calls[0][0];
      expect(callArg.data.refreshTokenHash).toBe(expectedHash);
      // Raw token must never appear in the stored data
      expect(JSON.stringify(callArg)).not.toContain(rawToken);
    });

    it('sets expiresAt approximately 7 days from now', async () => {
      mockPrisma.session.create.mockResolvedValueOnce({ id: 'sess-3' });

      const before = Date.now();
      await service.createSession('user-001', 'any-token');
      const after = Date.now();

      const callArg = mockPrisma.session.create.mock.calls[0][0];
      const expiresAt: Date = callArg.data.expiresAt;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
    });

    it('stores userId, fingerprint, userAgent, and ipAddress correctly', async () => {
      mockPrisma.session.create.mockResolvedValueOnce({ id: 'sess-4' });
      await service.createSession('user-002', 'tok', 'fp-hash', 'Mozilla/5.0', '10.0.0.1');

      const { data } = mockPrisma.session.create.mock.calls[0][0];
      expect(data.userId).toBe('user-002');
      expect(data.fingerprint).toBe('fp-hash');
      expect(data.userAgent).toBe('Mozilla/5.0');
      expect(data.ipAddress).toBe('10.0.0.1');
    });

    it('returns the result from prisma.session.create', async () => {
      const createdSession = { id: 'sess-5', userId: 'user-003' };
      mockPrisma.session.create.mockResolvedValueOnce(createdSession);

      const result = await service.createSession('user-003', 'tok2');
      expect(result).toBe(createdSession);
    });
  });

  // -------------------------------------------------------------------------
  // validateAndRotate
  // -------------------------------------------------------------------------
  describe('validateAndRotate()', () => {
    const rawToken = 'valid-refresh-token-abc123';
    const tokenHash = hashWith(rawToken, TEST_PEPPER);
    const userId = 'user-rotate-001';

    const validSession = {
      id: 'sess-valid-1',
      userId,
      refreshTokenHash: tokenHash,
      fingerprint: null,
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    };

    it('returns new session, new refreshToken, and userId on success', async () => {
      mockPrisma.session.findUnique.mockResolvedValueOnce(validSession);
      mockPrisma.session.update.mockResolvedValueOnce({ ...validSession, revokedAt: new Date() });

      const newSessionRecord = { id: 'sess-new-1', userId };
      mockPrisma.session.create.mockResolvedValueOnce(newSessionRecord);

      const result = await service.validateAndRotate(rawToken);

      expect(result.userId).toBe(userId);
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken).toHaveLength(64);
      expect(result.session).toBe(newSessionRecord);
    });

    it('throws SESSION_EXPIRED when no session is found for the token', async () => {
      // Both current and previous pepper lookups return null
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(service.validateAndRotate('nonexistent-token')).rejects.toThrow(
        'SESSION_EXPIRED',
      );
    });

    it('revokes all user sessions and throws SESSION_REVOKED on token reuse', async () => {
      const revokedSession = {
        ...validSession,
        revokedAt: new Date(Date.now() - 1000), // already revoked
      };
      mockPrisma.session.findUnique.mockResolvedValueOnce(revokedSession);
      mockPrisma.session.updateMany.mockResolvedValueOnce({ count: 3 });

      await expect(service.validateAndRotate(rawToken)).rejects.toThrow('SESSION_REVOKED');

      // Must have called updateMany to revoke all user sessions (theft detection)
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId }),
        }),
      );
    });

    it('throws SESSION_EXPIRED when session is past expiresAt', async () => {
      const expiredSession = {
        ...validSession,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      };
      mockPrisma.session.findUnique.mockResolvedValueOnce(expiredSession);

      await expect(service.validateAndRotate(rawToken)).rejects.toThrow('SESSION_EXPIRED');
    });

    it('throws FINGERPRINT_MISMATCH when fingerprints differ', async () => {
      const fpSession = {
        ...validSession,
        fingerprint: 'original-fp-hash',
      };
      mockPrisma.session.findUnique.mockResolvedValueOnce(fpSession);

      await expect(
        service.validateAndRotate(rawToken, 'different-fp-hash'),
      ).rejects.toThrow('FINGERPRINT_MISMATCH');
    });

    it('does NOT throw when fingerprint is absent on the session (not enforced)', async () => {
      const noFpSession = { ...validSession, fingerprint: null };
      mockPrisma.session.findUnique.mockResolvedValueOnce(noFpSession);
      mockPrisma.session.update.mockResolvedValueOnce({ ...noFpSession, revokedAt: new Date() });
      mockPrisma.session.create.mockResolvedValueOnce({ id: 'sess-new-2', userId });

      await expect(
        service.validateAndRotate(rawToken, 'any-fp'),
      ).resolves.not.toThrow();
    });

    it('does NOT throw when caller provides no fingerprint but session has one', async () => {
      const fpSession = { ...validSession, fingerprint: 'stored-fp' };
      mockPrisma.session.findUnique.mockResolvedValueOnce(fpSession);
      mockPrisma.session.update.mockResolvedValueOnce({ ...fpSession, revokedAt: new Date() });
      mockPrisma.session.create.mockResolvedValueOnce({ id: 'sess-new-3', userId });

      // No fingerprint argument — guard is only enforced when both sides have values
      await expect(service.validateAndRotate(rawToken)).resolves.not.toThrow();
    });

    it('revokes the old session before issuing the new one', async () => {
      mockPrisma.session.findUnique.mockResolvedValueOnce(validSession);
      mockPrisma.session.update.mockResolvedValueOnce({ ...validSession, revokedAt: new Date() });
      mockPrisma.session.create.mockResolvedValueOnce({ id: 'sess-new-4', userId });

      await service.validateAndRotate(rawToken);

      expect(mockPrisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: validSession.id },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('falls back to the previous pepper when the current pepper produces no match', async () => {
      const oldPepperToken = 'old-pepper-raw-token';
      const oldPepperHash = hashWith(oldPepperToken, TEST_PEPPER_PREVIOUS);

      const sessionWithOldPepper = {
        id: 'sess-old-pepper',
        userId: 'user-migrate',
        refreshTokenHash: oldPepperHash,
        fingerprint: null,
        userAgent: null,
        ipAddress: null,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };

      // First call (current pepper) → no match; second call (previous pepper) → match
      mockPrisma.session.findUnique
        .mockResolvedValueOnce(null) // current pepper lookup
        .mockResolvedValueOnce(sessionWithOldPepper); // previous pepper lookup

      mockPrisma.session.update.mockResolvedValueOnce({
        ...sessionWithOldPepper,
        revokedAt: new Date(),
      });
      mockPrisma.session.create.mockResolvedValueOnce({ id: 'sess-migrated', userId: 'user-migrate' });

      const result = await service.validateAndRotate(oldPepperToken);
      expect(result.userId).toBe('user-migrate');
    });
  });
});
