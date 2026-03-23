import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class CustomFieldsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string) {
    return this.prisma.customFieldDef.findMany({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.customFieldDef.findFirst({ where: { id, workspaceId } });
  }

  async create(workspaceId: string, data: any) {
    return this.prisma.customFieldDef.create({ data: { ...data, workspaceId } });
  }

  async update(id: string, data: any) {
    return this.prisma.customFieldDef.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.customFieldDef.delete({ where: { id } });
  }
}
