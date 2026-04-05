import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByWorkspace(workspaceId: string, includeInactive = false) {
    const where: any = { workspaceId };
    if (!includeInactive) where.isActive = true;
    return this.prisma.service.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.service.findFirst({
      where: { id, workspaceId },
    });
  }

  async create(
    workspaceId: string,
    data: { name: string; description?: string; slaMinutes?: number; routingMode?: string },
  ) {
    const startParam = createId();
    return this.prisma.service.create({
      data: { ...data, workspaceId, startParam },
    });
  }

  async update(
    id: string,
    data: { name?: string; description?: string | null; coverUrl?: string | null; slaMinutes?: number; routingMode?: string },
    version?: number,
  ) {
    const where: any = { id };
    if (version !== undefined) where.version = version;
    return this.prisma.service.update({
      where,
      data: { ...data, version: { increment: 1 } },
    });
  }

  async deactivate(id: string) {
    return this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
