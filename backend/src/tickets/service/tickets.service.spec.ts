import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from '../repository/tickets.repository';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal ticket shape that satisfies every code path in the service. */
const makeTicket = (overrides: Record<string, any> = {}): any => ({
  id: 'ticket-1',
  workspaceId: 'ws-1',
  serviceId: 'svc-1',
  customerId: 'cp-1',
  ticketNumber: 'T-2026-000001',
  status: 'NEW',
  priority: 'MEDIUM',
  title: null,
  summary: null,
  tags: [],
  version: 1,
  slaDeadline: new Date('2026-03-22T10:00:00Z'),
  firstResponseAt: null,
  resolvedAt: null,
  closedAt: null,
  rating: null,
  ratingComment: null,
  isDeleted: false,
  createdAt: new Date('2026-03-22T09:00:00Z'),
  updatedAt: new Date('2026-03-22T09:00:00Z'),
  deletedAt: null,
  assigneeId: null,
  customer: {
    id: 'cp-1',
    clientNumber: 'C-001',
    userId: 'user-1',
    createdAt: new Date('2026-03-22T09:00:00Z'),
    updatedAt: new Date('2026-03-22T09:00:00Z'),
    version: 1,
    workspaceId: 'ws-1',
    isDeleted: false,
    deletedAt: null,
    segment: null,
    notes: null,
    isBanned: false,
    banReason: null,
    customFields: {},
    user: {
      id: 'user-1',
      firstName: 'Alice',
      lastName: 'Smith',
      username: 'alice',
      photoUrl: null,
    },
  },
  service: { id: 'svc-1', name: 'General Support' },
  assignee: null,
  messages: [],
  ...overrides,
});

const makeCounters = () => ({ new: 10, inProgress: 5, waitingCustomer: 3, slaOverdue: 1 });

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TicketsService', () => {
  let service: TicketsService;
  let repo: jest.Mocked<TicketsRepository>;
  let prisma: any;

  /**
   * Build a fresh $transaction stub that executes the callback with a
   * configurable tx object.  Returns a factory so each test can override
   * the tx behaviour without touching the outer mock.
   */
  const makeTxStub = (lastValue = 0, createdTicket = makeTicket()) =>
    jest.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
      const tx = {
        $queryRaw: jest.fn()
          .mockResolvedValueOnce([{ lastValue }]) // SELECT … FOR UPDATE
          .mockResolvedValueOnce([]),              // UPDATE WorkspaceCounter
        ticket: {
          create: jest.fn().mockResolvedValue(createdTicket),
        },
      };
      return cb(tx);
    });

  beforeEach(async () => {
    prisma = {
      customerProfile: { findUnique: jest.fn() },
      service: { findFirst: jest.fn() },
      $transaction: makeTxStub(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: TicketsRepository,
          useValue: {
            findByWorkspace: jest.fn(),
            getCounters: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            rate: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TicketsService);
    repo = module.get(TicketsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // list — paginated result with correct meta
  // -------------------------------------------------------------------------
  describe('list', () => {
    it('returns paginated tickets with correct meta for an AGENT', async () => {
      const tickets = [makeTicket(), makeTicket({ id: 'ticket-2' })];
      repo.findByWorkspace.mockResolvedValue({ data: tickets, total: 25 });
      repo.getCounters.mockResolvedValue(makeCounters());

      const result = await service.list('ws-1', { page: 2, limit: 10 }, 'AGENT');

      expect(result.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
      expect(result.data).toHaveLength(2);
      expect(result.counters).toEqual(makeCounters());
    });

    it('computes totalPages correctly for an exact multiple', async () => {
      repo.findByWorkspace.mockResolvedValue({ data: [], total: 20 });
      repo.getCounters.mockResolvedValue(makeCounters());

      const result = await service.list('ws-1', { page: 1, limit: 20 }, 'AGENT');

      expect(result.meta.totalPages).toBe(1);
    });

    it('computes totalPages correctly for a partial last page', async () => {
      repo.findByWorkspace.mockResolvedValue({ data: [], total: 21 });
      repo.getCounters.mockResolvedValue(makeCounters());

      const result = await service.list('ws-1', { page: 1, limit: 20 }, 'AGENT');

      expect(result.meta.totalPages).toBe(2);
    });

    it('injects customerId filter for CUSTOMER role', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue({ id: 'cp-1' });
      repo.findByWorkspace.mockResolvedValue({ data: [], total: 0 });
      repo.getCounters.mockResolvedValue(makeCounters());

      const filters: any = { page: 1, limit: 20 };
      await service.list('ws-1', filters, 'CUSTOMER', 'user-1');

      expect(repo.findByWorkspace).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ customerId: 'cp-1' }),
      );
    });

    it('returns empty result when CUSTOMER has no profile', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue(null);

      const result = await service.list('ws-1', { page: 1, limit: 20 }, 'CUSTOMER', 'ghost');

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
      expect(repo.findByWorkspace).not.toHaveBeenCalled();
    });

    it('formats list items — includes lastMessage from most recent message', async () => {
      const ticket = makeTicket({
        messages: [{ text: 'Hello', createdAt: new Date('2026-03-22T09:30:00Z') }],
      });
      repo.findByWorkspace.mockResolvedValue({ data: [ticket], total: 1 });
      repo.getCounters.mockResolvedValue(makeCounters());

      const result = await service.list('ws-1', { page: 1, limit: 20 }, 'AGENT');

      expect(result.data[0].lastMessage).toBe('Hello');
      expect(result.data[0].lastMessageAt).toBe('2026-03-22T09:30:00.000Z');
    });
  });

  // -------------------------------------------------------------------------
  // getById — found / not found / CUSTOMER scoping
  // -------------------------------------------------------------------------
  describe('getById', () => {
    it('returns a formatted ticket when found as AGENT', async () => {
      repo.findById.mockResolvedValue(makeTicket());

      const result = await service.getById('ws-1', 'ticket-1', 'AGENT');

      expect(result.id).toBe('ticket-1');
      expect(result.ticketNumber).toBe('T-2026-000001');
      expect(result.customer.firstName).toBe('Alice');
      expect(result.customer.lastName).toBe('Smith');
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById('ws-1', 'missing', 'AGENT')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when CUSTOMER requests another customer\'s ticket', async () => {
      repo.findById.mockResolvedValue(makeTicket()); // customer.userId === 'user-1'

      await expect(
        service.getById('ws-1', 'ticket-1', 'CUSTOMER', 'user-other'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows CUSTOMER to view their own ticket', async () => {
      repo.findById.mockResolvedValue(makeTicket()); // customer.userId === 'user-1'

      await expect(
        service.getById('ws-1', 'ticket-1', 'CUSTOMER', 'user-1'),
      ).resolves.toBeDefined();
    });

    it('formats the detail view correctly (no assignee)', async () => {
      repo.findById.mockResolvedValue(makeTicket());

      const result = await service.getById('ws-1', 'ticket-1', 'AGENT');

      expect(result.assignee).toBeNull();
      expect(result.service).toEqual({ id: 'svc-1', name: 'General Support' });
    });
  });

  // -------------------------------------------------------------------------
  // create — workspace scoping and ticket number generation
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('creates a ticket scoped to the workspace with correct ticket number', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue({ id: 'cp-1' });
      prisma.service.findFirst.mockResolvedValue({
        id: 'svc-1', slaMinutes: 60, workspaceId: 'ws-1', isActive: true,
      });

      // Capture what tx.ticket.create receives
      let capturedCreateArgs: any;
      prisma.$transaction = jest.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          $queryRaw: jest.fn()
            .mockResolvedValueOnce([{ lastValue: 5 }])  // counter is currently 5
            .mockResolvedValueOnce([]),
          ticket: {
            create: jest.fn().mockImplementation((args: any) => {
              capturedCreateArgs = args;
              return makeTicket({ ticketNumber: 'T-2026-000006' });
            }),
          },
        };
        return cb(tx);
      });

      await service.create('ws-1', { serviceId: 'svc-1', message: 'Help!' }, 'user-1');

      expect(capturedCreateArgs.data.workspaceId).toBe('ws-1');
      expect(capturedCreateArgs.data.serviceId).toBe('svc-1');
      expect(capturedCreateArgs.data.customerId).toBe('cp-1');
      // lastValue 5 + 1 = 6, zero-padded to 6 digits
      expect(capturedCreateArgs.data.ticketNumber).toBe('T-2026-000006');
    });

    it('sets slaDeadline based on service slaMinutes', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue({ id: 'cp-1' });
      prisma.service.findFirst.mockResolvedValue({
        id: 'svc-1', slaMinutes: 120, workspaceId: 'ws-1', isActive: true,
      });

      const frozenNow = 1742000000000;
      jest.spyOn(Date, 'now').mockReturnValue(frozenNow);

      let capturedData: any;
      prisma.$transaction = jest.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          $queryRaw: jest.fn()
            .mockResolvedValueOnce([{ lastValue: 0 }])
            .mockResolvedValueOnce([]),
          ticket: {
            create: jest.fn().mockImplementation(({ data }: any) => {
              capturedData = data;
              return makeTicket();
            }),
          },
        };
        return cb(tx);
      });

      await service.create('ws-1', { serviceId: 'svc-1' }, 'user-1');

      expect(capturedData.slaDeadline).toEqual(new Date(frozenNow + 120 * 60 * 1000));
      jest.restoreAllMocks();
    });

    it('throws ForbiddenException when customer profile is not found', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.create('ws-1', { serviceId: 'svc-1' }, 'ghost-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when service does not exist in workspace', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue({ id: 'cp-1' });
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.create('ws-1', { serviceId: 'svc-unknown' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // update — status transition validation via TicketStateMachine
  // -------------------------------------------------------------------------
  describe('update (status transitions)', () => {
    it('allows valid transition NEW -> IN_PROGRESS', async () => {
      repo.findById.mockResolvedValue(makeTicket({ status: 'NEW' }));
      repo.update.mockResolvedValue(makeTicket({ status: 'IN_PROGRESS', version: 2 }));

      const result = await service.update('ws-1', 'ticket-1', { status: 'IN_PROGRESS' });

      expect(result.status).toBe('IN_PROGRESS');
      expect(repo.update).toHaveBeenCalledWith(
        'ticket-1',
        expect.objectContaining({ status: 'IN_PROGRESS' }),
        undefined,
      );
    });

    it('allows valid transition IN_PROGRESS -> RESOLVED and sets resolvedAt', async () => {
      repo.findById.mockResolvedValue(makeTicket({ status: 'IN_PROGRESS' }));
      repo.update.mockResolvedValue(makeTicket({ status: 'RESOLVED' }));

      await service.update('ws-1', 'ticket-1', { status: 'RESOLVED' });

      expect(repo.update).toHaveBeenCalledWith(
        'ticket-1',
        expect.objectContaining({ status: 'RESOLVED', resolvedAt: expect.any(Date) }),
        undefined,
      );
    });

    it('allows valid transition RESOLVED -> CLOSED and sets closedAt', async () => {
      repo.findById.mockResolvedValue(makeTicket({ status: 'RESOLVED', resolvedAt: new Date() }));
      repo.update.mockResolvedValue(makeTicket({ status: 'CLOSED' }));

      await service.update('ws-1', 'ticket-1', { status: 'CLOSED' });

      expect(repo.update).toHaveBeenCalledWith(
        'ticket-1',
        expect.objectContaining({ status: 'CLOSED', closedAt: expect.any(Date) }),
        undefined,
      );
    });

    it('rejects invalid transition CLOSED -> NEW', async () => {
      repo.findById.mockResolvedValue(makeTicket({ status: 'CLOSED' }));

      await expect(
        service.update('ws-1', 'ticket-1', { status: 'NEW' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects invalid transition NEW -> CLOSED (skipping intermediate states)', async () => {
      repo.findById.mockResolvedValue(makeTicket({ status: 'NEW' }));

      await expect(
        service.update('ws-1', 'ticket-1', { status: 'CLOSED' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects RESOLVED -> IN_PROGRESS when resolved more than 7 days ago', async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      repo.findById.mockResolvedValue(makeTicket({ status: 'RESOLVED', resolvedAt: eightDaysAgo }));

      await expect(
        service.update('ws-1', 'ticket-1', { status: 'IN_PROGRESS' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows RESOLVED -> IN_PROGRESS when resolved within 7 days', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      repo.findById.mockResolvedValue(makeTicket({ status: 'RESOLVED', resolvedAt: threeDaysAgo }));
      repo.update.mockResolvedValue(makeTicket({ status: 'IN_PROGRESS' }));

      await expect(
        service.update('ws-1', 'ticket-1', { status: 'IN_PROGRESS' }),
      ).resolves.toBeDefined();
    });

    it('throws NotFoundException when ticket is missing', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update('ws-1', 'missing', { status: 'IN_PROGRESS' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on Prisma P2025 (optimistic lock failure)', async () => {
      repo.findById.mockResolvedValue(makeTicket({ status: 'NEW' }));

      const p2025 = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      repo.update.mockRejectedValue(p2025);

      await expect(
        service.update('ws-1', 'ticket-1', { status: 'IN_PROGRESS' }, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('propagates unknown errors without wrapping', async () => {
      repo.findById.mockResolvedValue(makeTicket({ status: 'NEW' }));
      repo.update.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        service.update('ws-1', 'ticket-1', { status: 'IN_PROGRESS' }),
      ).rejects.toThrow('DB connection lost');
    });

    it('passes version to repo.update when provided', async () => {
      repo.findById.mockResolvedValue(makeTicket({ status: 'NEW' }));
      repo.update.mockResolvedValue(makeTicket({ status: 'IN_PROGRESS', version: 2 }));

      await service.update('ws-1', 'ticket-1', { status: 'IN_PROGRESS' }, 1);

      expect(repo.update).toHaveBeenCalledWith(
        'ticket-1',
        expect.any(Object),
        1, // version forwarded
      );
    });
  });
});
