import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from '../repository/users.repository';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: { findById: jest.fn(), update: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(UsersService);
    repo = module.get(UsersRepository);
  });

  it('getMe returns formatted user with memberships', async () => {
    repo.findById.mockResolvedValue({
      id: 'u1', telegramId: BigInt(123), username: 'alice',
      firstName: 'Alice', lastName: null, languageCode: 'en',
      photoUrl: null, isBot: false,
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
      memberships: [{
        id: 'm1', role: 'ADMIN', status: 'ACTIVE',
        workspaceId: 'w1', joinedAt: new Date('2026-01-01'),
        workspace: { name: 'TestWS' },
      }],
    } as any);

    const result = await service.getMe('u1');
    expect(result.telegramId).toBe('123');
    expect(result.memberships).toHaveLength(1);
    expect(result.memberships[0].workspaceName).toBe('TestWS');
  });

  it('getMe throws NotFoundException for missing user', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getMe('bad')).rejects.toThrow(NotFoundException);
  });

  it('updateMe calls repo.update then returns refreshed user', async () => {
    const mockUser = {
      id: 'u1', telegramId: BigInt(123), username: 'alice',
      firstName: 'Updated', lastName: null, languageCode: 'en',
      photoUrl: null, isBot: false,
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
      memberships: [],
    } as any;
    repo.update.mockResolvedValue(mockUser);
    repo.findById.mockResolvedValue(mockUser);

    const result = await service.updateMe('u1', { firstName: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith('u1', { firstName: 'Updated' });
    expect(result.firstName).toBe('Updated');
  });
});
