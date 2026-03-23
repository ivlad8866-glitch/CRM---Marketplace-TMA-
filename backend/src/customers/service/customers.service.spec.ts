import { Test } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { CustomersRepository } from '../repository/customers.repository';
import { NotFoundException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let repo: jest.Mocked<CustomersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: CustomersRepository,
          useValue: { findByWorkspace: jest.fn(), findById: jest.fn(), update: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(CustomersService);
    repo = module.get(CustomersRepository);
  });

  it('getById throws NotFoundException for missing customer', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('w1', 'bad')).rejects.toThrow(NotFoundException);
  });

  it('list returns paginated results', async () => {
    repo.findByWorkspace.mockResolvedValue({
      data: [{
        id: 'cp1', clientNumber: 'C-000001', segment: null,
        isBanned: false, notes: null, banReason: null, customFields: {},
        version: 1, isDeleted: false, deletedAt: null,
        userId: 'u1', workspaceId: 'w1',
        createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
        user: { id: 'u1', firstName: 'Alice', lastName: null, username: 'alice', photoUrl: null },
        _count: { tickets: 3 },
      }],
      total: 1,
    } as any);

    const result = await service.list('w1', { page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].ticketCount).toBe(3);
    expect(result.meta.total).toBe(1);
  });
});
