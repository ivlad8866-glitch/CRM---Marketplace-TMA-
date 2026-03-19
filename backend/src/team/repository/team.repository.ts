import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string) {
    return this.prisma.membership.findMany({
      where: { workspaceId, role: { not: 'CUSTOMER' } },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.membership.findFirst({
      where: { id, workspaceId, role: { not: 'CUSTOMER' } },
      include: { user: true },
    });
  }

  async findByTelegramId(telegramId: bigint, workspaceId: string) {
    return this.prisma.membership.findFirst({
      where: { user: { telegramId }, workspaceId },
    });
  }

  async countOwners(workspaceId: string) {
    return this.prisma.membership.count({
      where: { workspaceId, role: 'WORKSPACE_OWNER', status: 'ACTIVE' },
    });
  }

  async invite(workspaceId: string, telegramId: string, role: 'ADMIN' | 'AGENT') {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { telegramId: BigInt(telegramId) },
        create: { telegramId: BigInt(telegramId), firstName: 'Invited' },
        update: {},
      });

      return tx.membership.create({
        data: { userId: user.id, workspaceId, role, status: 'INVITED' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true },
          },
        },
      });
    });
  }

  async updateRole(id: string, data: { role?: string; status?: string }) {
    return this.prisma.membership.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true },
        },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.membership.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
