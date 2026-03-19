import { Test } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from '../repository/tickets.repository';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotFoundException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';

describe('TicketsService', () => {
  let service: TicketsService;
  let repo: jest.Mocked<TicketsRepository>;

  const mockTicket = {
    id: 't1', ticketNumber: 'T-2026-000001', status: 'NEW', priority: 'NORMAL',
    title: null, summary: null, tags: [], slaDeadline: null, rating: null,
    ratingComment: null, version: 1, isDeleted: false, firstResponseAt: null,
    resolvedAt: null, closedAt: null,
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    customer: { id: 'cp1', clientNumber: 'C-000001', userId: 'u1',
      user: { id: 'u1', firstName: 'Alice', lastName: null, username: 'alice', photoUrl: null } },
    service: { id: 's1', name: 'Support' },
    assignee: null,
  } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: TicketsRepository,
          useValue: {
            findByWorkspace: jest.fn(), getCounters: jest.fn(),
            findById: jest.fn(), update: jest.fn(), rate: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            customerProfile: { findUnique: jest.fn() },
            service: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(TicketsService);
    repo = module.get(TicketsRepository);
  });

  it('getById throws NotFoundException for missing ticket', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('w1', 'bad', 'ADMIN')).rejects.toThrow(NotFoundException);
  });

  it('getById throws ForbiddenException for CUSTOMER viewing other ticket', async () => {
    repo.findById.mockResolvedValue(mockTicket);
    await expect(service.getById('w1', 't1', 'CUSTOMER', 'other-user')).rejects.toThrow(ForbiddenException);
  });

  it('update validates state machine transitions', async () => {
    repo.findById.mockResolvedValue(mockTicket);
    await expect(service.update('w1', 't1', { status: 'CLOSED' }, 1)).rejects.toThrow(UnprocessableEntityException);
  });

  it('update allows valid transition NEW -> IN_PROGRESS', async () => {
    repo.findById.mockResolvedValue(mockTicket);
    repo.update.mockResolvedValue({ ...mockTicket, status: 'IN_PROGRESS' });
    const result = await service.update('w1', 't1', { status: 'IN_PROGRESS' }, 1);
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('rate throws ForbiddenException for non-customer', async () => {
    repo.findById.mockResolvedValue(mockTicket);
    await expect(service.rate('w1', 't1', 'other-user', 5)).rejects.toThrow(ForbiddenException);
  });

  it('rate throws for non-resolved ticket', async () => {
    repo.findById.mockResolvedValue(mockTicket); // status is NEW
    await expect(service.rate('w1', 't1', 'u1', 5)).rejects.toThrow(UnprocessableEntityException);
  });
});
