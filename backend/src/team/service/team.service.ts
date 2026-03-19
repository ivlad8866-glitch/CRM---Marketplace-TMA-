import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { TeamRepository } from '../repository/team.repository';

@Injectable()
export class TeamService {
  constructor(private readonly repo: TeamRepository) {}

  async list(workspaceId: string) {
    const members = await this.repo.findByWorkspace(workspaceId);
    return members.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      userId: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      username: m.user.username,
      photoUrl: m.user.photoUrl,
      joinedAt: m.joinedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async invite(workspaceId: string, telegramId: string, role: 'ADMIN' | 'AGENT') {
    const existing = await this.repo.findByTelegramId(BigInt(telegramId), workspaceId);
    if (existing) throw new ConflictException('CONFLICT');

    const membership = await this.repo.invite(workspaceId, telegramId, role);
    return {
      id: membership.id,
      role: membership.role,
      status: membership.status,
      userId: membership.user.id,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      username: membership.user.username,
      joinedAt: null,
      createdAt: membership.createdAt.toISOString(),
    };
  }

  async updateMember(workspaceId: string, membershipId: string, data: { role?: string; status?: string }) {
    const member = await this.repo.findById(membershipId, workspaceId);
    if (!member) throw new NotFoundException('USER_NOT_FOUND');
    const updated = await this.repo.updateRole(membershipId, data) as any;
    return {
      id: updated.id,
      role: updated.role,
      status: updated.status,
      userId: updated.user.id,
      firstName: updated.user.firstName,
    };
  }

  async remove(workspaceId: string, membershipId: string, actorUserId: string) {
    const member = await this.repo.findById(membershipId, workspaceId);
    if (!member) throw new NotFoundException('USER_NOT_FOUND');

    if (member.userId === actorUserId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    if (member.role === 'WORKSPACE_OWNER') {
      const ownerCount = await this.repo.countOwners(workspaceId);
      if (ownerCount <= 1) throw new ForbiddenException('FORBIDDEN');
    }

    await this.repo.remove(membershipId);
  }
}
