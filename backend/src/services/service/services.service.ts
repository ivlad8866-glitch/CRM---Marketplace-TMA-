import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServicesRepository } from '../repository/services.repository';

@Injectable()
export class ServicesService {
  constructor(private readonly repo: ServicesRepository) {}

  async list(workspaceId: string, includeInactive = false) {
    const services = await this.repo.findAllByWorkspace(workspaceId, includeInactive);
    return services.map((s) => this.formatResponse(s));
  }

  async create(
    workspaceId: string,
    dto: { name: string; description?: string; slaMinutes?: number; routingMode?: string },
  ) {
    const service = await this.repo.create(workspaceId, dto);
    return this.formatResponse(service);
  }

  async update(workspaceId: string, serviceId: string, dto: any, version?: number) {
    const existing = await this.repo.findById(serviceId, workspaceId);
    if (!existing) throw new NotFoundException('SERVICE_NOT_FOUND');

    try {
      const updated = await this.repo.update(serviceId, dto, version);
      return this.formatResponse(updated);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new ConflictException('CONFLICT');
      }
      throw e;
    }
  }

  async deactivate(workspaceId: string, serviceId: string) {
    const existing = await this.repo.findById(serviceId, workspaceId);
    if (!existing) throw new NotFoundException('SERVICE_NOT_FOUND');
    await this.repo.deactivate(serviceId);
  }

  private formatResponse(s: any) {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      startParam: s.startParam,
      slaMinutes: s.slaMinutes,
      isActive: s.isActive,
      routingMode: s.routingMode,
      version: s.version,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
