import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class MacrosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string) {
    return this.prisma.macro.findMany({
      where: { workspaceId },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.macro.findFirst({ where: { id, workspaceId } });
  }

  async create(
    workspaceId: string,
    data: { name: string; content: string; category?: string; sortOrder?: number },
  ) {
    return this.prisma.macro.create({ data: { ...data, workspaceId } });
  }

  async update(
    id: string,
    data: { name?: string; content?: string; category?: string; sortOrder?: number },
    version?: number,
  ) {
    const where: any = { id };
    if (version !== undefined) where.version = version;
    return this.prisma.macro.update({
      where,
      data: { ...data, version: { increment: 1 } },
    });
  }

  async remove(id: string) {
    return this.prisma.macro.delete({ where: { id } });
  }
}
