import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MacrosRepository } from '../repository/macros.repository';

@Injectable()
export class MacrosService {
  constructor(private readonly repo: MacrosRepository) {}

  async list(workspaceId: string) {
    const macros = await this.repo.findByWorkspace(workspaceId);
    return macros.map((m) => ({
      id: m.id,
      name: m.name,
      content: m.content,
      category: m.category,
      sortOrder: m.sortOrder,
      version: m.version,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async create(
    workspaceId: string,
    dto: { name: string; content: string; category?: string; sortOrder?: number },
  ) {
    const macro = await this.repo.create(workspaceId, dto);
    return {
      id: macro.id,
      name: macro.name,
      content: macro.content,
      category: macro.category,
      sortOrder: macro.sortOrder,
      version: macro.version,
      createdAt: macro.createdAt.toISOString(),
    };
  }

  async update(workspaceId: string, macroId: string, dto: any, version?: number) {
    const existing = await this.repo.findById(macroId, workspaceId);
    if (!existing) throw new NotFoundException('NOT_FOUND');
    try {
      const updated = await this.repo.update(macroId, dto, version);
      return {
        id: updated.id,
        name: updated.name,
        content: updated.content,
        category: updated.category,
        sortOrder: updated.sortOrder,
        version: updated.version,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new ConflictException('CONFLICT');
      }
      throw e;
    }
  }

  async remove(workspaceId: string, macroId: string) {
    const existing = await this.repo.findById(macroId, workspaceId);
    if (!existing) throw new NotFoundException('NOT_FOUND');
    await this.repo.remove(macroId);
  }
}
