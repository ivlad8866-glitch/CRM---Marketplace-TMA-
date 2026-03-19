import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.workspace.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findMembership(userId: string, workspaceId: string) {
    return this.prisma.membership.findFirst({
      where: { userId, workspaceId, status: 'ACTIVE' },
    });
  }

  async create(data: CreateWorkspaceDto, ownerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({ data });

      await tx.membership.create({
        data: {
          userId: ownerId,
          workspaceId: workspace.id,
          role: 'WORKSPACE_OWNER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });

      await tx.workspaceCounter.createMany({
        data: [
          { workspaceId: workspace.id, counterType: 'client', lastValue: 0 },
          { workspaceId: workspace.id, counterType: 'ticket', lastValue: 0 },
        ],
      });

      return workspace;
    });
  }

  async update(id: string, data: UpdateWorkspaceDto) {
    return this.prisma.workspace.update({ where: { id }, data });
  }
}
