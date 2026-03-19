import { Test } from '@nestjs/testing';
import { ServicesService } from './services.service';
import { ServicesRepository } from '../repository/services.repository';
import { NotFoundException } from '@nestjs/common';

describe('ServicesService', () => {
  let service: ServicesService;
  let repo: jest.Mocked<ServicesRepository>;

  const mockSvc = {
    id: 's1', name: 'Support', description: null, startParam: 'abc123',
    slaMinutes: 30, isActive: true, routingMode: 'manual', version: 1,
    workspaceId: 'w1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: ServicesRepository,
          useValue: {
            findAllByWorkspace: jest.fn(), findById: jest.fn(),
            create: jest.fn(), update: jest.fn(), deactivate: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(ServicesService);
    repo = module.get(ServicesRepository);
  });

  it('list returns formatted services', async () => {
    repo.findAllByWorkspace.mockResolvedValue([mockSvc]);
    const result = await service.list('w1');
    expect(result).toHaveLength(1);
    expect(result[0].startParam).toBe('abc123');
  });

  it('create returns new service', async () => {
    repo.create.mockResolvedValue(mockSvc);
    const result = await service.create('w1', { name: 'Support' });
    expect(result.name).toBe('Support');
  });

  it('update throws NotFoundException for missing service', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.update('w1', 'bad', {}, 1)).rejects.toThrow(NotFoundException);
  });

  it('deactivate calls repo.deactivate', async () => {
    repo.findById.mockResolvedValue(mockSvc);
    await service.deactivate('w1', 's1');
    expect(repo.deactivate).toHaveBeenCalledWith('s1');
  });
});
