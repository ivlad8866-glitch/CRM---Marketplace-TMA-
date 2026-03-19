import { Test } from '@nestjs/testing';
import { TeamService } from './team.service';
import { TeamRepository } from '../repository/team.repository';
import { ForbiddenException, ConflictException } from '@nestjs/common';

describe('TeamService', () => {
  let service: TeamService;
  let repo: jest.Mocked<TeamRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: TeamRepository,
          useValue: {
            findByWorkspace: jest.fn(), findById: jest.fn(),
            findByTelegramId: jest.fn(), countOwners: jest.fn(),
            invite: jest.fn(), updateRole: jest.fn(), remove: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(TeamService);
    repo = module.get(TeamRepository);
  });

  it('remove throws ForbiddenException when removing self', async () => {
    repo.findById.mockResolvedValue({ userId: 'u1', role: 'ADMIN' } as any);
    await expect(service.remove('w1', 'm1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('remove throws ForbiddenException when removing last owner', async () => {
    repo.findById.mockResolvedValue({ userId: 'u2', role: 'WORKSPACE_OWNER' } as any);
    repo.countOwners.mockResolvedValue(1);
    await expect(service.remove('w1', 'm1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('invite throws ConflictException for existing member', async () => {
    repo.findByTelegramId.mockResolvedValue({ id: 'existing' } as any);
    await expect(service.invite('w1', '123', 'AGENT')).rejects.toThrow(ConflictException);
  });
});
