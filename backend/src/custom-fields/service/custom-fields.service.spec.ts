import { Test } from '@nestjs/testing';
import { CustomFieldsService } from './custom-fields.service';
import { CustomFieldsRepository } from '../repository/custom-fields.repository';
import { NotFoundException } from '@nestjs/common';

describe('CustomFieldsService', () => {
  let service: CustomFieldsService;
  let repo: jest.Mocked<CustomFieldsRepository>;

  const mockField = {
    id: 'cf1', name: 'company', label: 'Company', fieldType: 'text',
    options: null, isRequired: false, sortOrder: 0, workspaceId: 'w1',
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CustomFieldsService,
        {
          provide: CustomFieldsRepository,
          useValue: {
            findByWorkspace: jest.fn(), findById: jest.fn(),
            create: jest.fn(), update: jest.fn(), remove: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(CustomFieldsService);
    repo = module.get(CustomFieldsRepository);
  });

  it('list returns formatted fields', async () => {
    repo.findByWorkspace.mockResolvedValue([mockField]);
    const result = await service.list('w1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('company');
  });

  it('remove throws NotFoundException for missing field', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.remove('w1', 'bad')).rejects.toThrow(NotFoundException);
  });

  it('update throws NotFoundException for missing field', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.update('w1', 'bad', {})).rejects.toThrow(NotFoundException);
  });
});
