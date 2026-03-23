import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorkspacesRepository } from '../repository/workspaces.repository';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly repo: WorkspacesRepository) {}

  async create(dto: CreateWorkspaceDto, userId: string) {
    const workspace = await this.repo.create(dto, userId);
    return this.formatResponse(workspace);
  }

  async getById(workspaceId: string, userId: string) {
    const ws = await this.repo.findById(workspaceId);
    if (!ws) throw new NotFoundException('WORKSPACE_NOT_FOUND');

    const membership = await this.repo.findMembership(userId, workspaceId);
    if (!membership) throw new ForbiddenException('FORBIDDEN');

    return this.formatResponse(ws);
  }

  async update(workspaceId: string, dto: UpdateWorkspaceDto) {
    const ws = await this.repo.findById(workspaceId);
    if (!ws) throw new NotFoundException('WORKSPACE_NOT_FOUND');
    const updated = await this.repo.update(workspaceId, dto);
    return this.formatResponse(updated);
  }

  private formatResponse(ws: any) {
    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      botUsername: ws.botUsername,
      brandConfig: ws.brandConfig,
      slaDefaults: ws.slaDefaults,
      createdAt: ws.createdAt.toISOString(),
    };
  }
}
