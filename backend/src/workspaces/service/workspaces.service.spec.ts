import { Test } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesRepository } from '../repository/workspaces.repository';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let repo: jest.Mocked<WorkspacesRepository>;

  const mockWs = {
    id: 'w1', name: 'Test', slug: 'test', botUsername: null,
    brandConfig: {}, slaDefaults: {}, isDeleted: false, deletedAt: null,
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: WorkspacesRepository,
          useValue: { findById: jest.fn(), findMembership: jest.fn(), create: jest.fn(), update: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(WorkspacesService);
    repo = module.get(WorkspacesRepository);
  });

  it('create returns formatted workspace', async () => {
    repo.create.mockResolvedValue(mockWs);
    const result = await service.create({ name: 'Test', slug: 'test' }, 'u1');
    expect(result.id).toBe('w1');
    expect(repo.create).toHaveBeenCalledWith({ name: 'Test', slug: 'test' }, 'u1');
  });

  it('getById throws NotFoundException when missing', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('bad', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('getById throws ForbiddenException for non-member', async () => {
    repo.findById.mockResolvedValue(mockWs);
    repo.findMembership.mockResolvedValue(null);
    await expect(service.getById('w1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('update returns updated workspace', async () => {
    repo.findById.mockResolvedValue(mockWs);
    repo.update.mockResolvedValue({ ...mockWs, name: 'Updated' });
    const result = await service.update('w1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});
