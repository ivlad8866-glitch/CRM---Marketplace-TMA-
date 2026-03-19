import { Test } from '@nestjs/testing';
import { MacrosService } from './macros.service';
import { MacrosRepository } from '../repository/macros.repository';
import { NotFoundException } from '@nestjs/common';

describe('MacrosService', () => {
  let service: MacrosService;
  let repo: jest.Mocked<MacrosRepository>;

  const mockMacro = {
    id: 'm1', name: 'Greeting', content: 'Hello!', category: 'general',
    sortOrder: 0, version: 1, workspaceId: 'w1',
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MacrosService,
        {
          provide: MacrosRepository,
          useValue: {
            findByWorkspace: jest.fn(), findById: jest.fn(),
            create: jest.fn(), update: jest.fn(), remove: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(MacrosService);
    repo = module.get(MacrosRepository);
  });

  it('list returns formatted macros', async () => {
    repo.findByWorkspace.mockResolvedValue([mockMacro]);
    const result = await service.list('w1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Greeting');
  });

  it('remove throws NotFoundException for missing macro', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.remove('w1', 'bad')).rejects.toThrow(NotFoundException);
  });
});
