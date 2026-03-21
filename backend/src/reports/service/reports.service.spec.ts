import { Test } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: {
            ticket: {
              findMany: jest.fn(),
              groupBy: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ReportsService);
    prisma = module.get(PrismaService);
  });

  it('returns KPI summary with correct structure', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        total_tickets: 100n,
        resolved_tickets: 80n,
        avg_first_response_minutes: 15.5,
        avg_resolution_minutes: 120.3,
        sla_breached: 5n,
      },
    ]);
    prisma.ticket.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { id: 10 } },
      { status: 'IN_PROGRESS', _count: { id: 30 } },
      { status: 'RESOLVED', _count: { id: 80 } },
    ]);

    const result = await service.getKpiSummary('w1', {
      from: '2026-03-01T00:00:00Z',
      to: '2026-03-19T23:59:59Z',
    });

    expect(result).toHaveProperty('totalTickets', 100);
    expect(result).toHaveProperty('resolvedTickets', 80);
    expect(result).toHaveProperty('avgFirstResponseMinutes');
    expect(result).toHaveProperty('avgResolutionMinutes');
    expect(result).toHaveProperty('slaBreached', 5);
    expect(result).toHaveProperty('byStatus');
    expect(result.byStatus).toHaveLength(3);
  });

  it('generates CSV with correct field names and sanitized content', async () => {
    prisma.ticket.findMany.mockResolvedValue([
      {
        id: 't1',
        ticketNumber: 'TK-101',
        title: 'Test ticket',
        status: 'RESOLVED',
        priority: 'NORMAL',
        createdAt: new Date('2026-03-10'),
        resolvedAt: new Date('2026-03-11'),
        firstResponseAt: new Date('2026-03-10'),
        closedAt: null,
        slaDeadline: new Date('2026-03-12'),
        assignee: { user: { firstName: 'Agent', lastName: 'Smith' } },
        service: { name: 'Support' },
        customer: { user: { firstName: 'John', lastName: null } },
      },
      {
        id: 't2',
        ticketNumber: 'TK-102',
        title: '=HYPERLINK("evil")',
        status: 'NEW',
        priority: 'HIGH',
        createdAt: new Date('2026-03-11'),
        resolvedAt: null,
        firstResponseAt: null,
        closedAt: null,
        slaDeadline: null,
        assignee: null,
        service: null,
        customer: { user: { firstName: 'Jane', lastName: 'Doe' } },
      },
    ]);

    const csv = await service.exportTicketsCsv('w1', {
      from: '2026-03-01T00:00:00Z',
      to: '2026-03-19T23:59:59Z',
    });

    expect(csv).toContain('id,ticketNumber,title');
    expect(csv).toContain('t1');
    expect(csv).toContain('Agent Smith');
    expect(csv).toContain('John'); // no "null" for missing lastName
    expect(csv).not.toContain('=HYPERLINK'); // CSV injection sanitized
  });

  it('applies agentId and serviceId filters', async () => {
    prisma.ticket.findMany.mockResolvedValue([]);

    await service.exportTicketsCsv('w1', {
      from: '2026-03-01T00:00:00Z',
      to: '2026-03-19T23:59:59Z',
      agentId: 'agent-1',
      serviceId: 'svc-1',
    });

    const call = prisma.ticket.findMany.mock.calls[0][0];
    expect(call.where.assigneeId).toBe('agent-1');
    expect(call.where.serviceId).toBe('svc-1');
  });
});
