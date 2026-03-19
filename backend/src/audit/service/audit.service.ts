import { Injectable } from '@nestjs/common';
import { AuditRepository } from '../repository/audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async list(workspaceId: string, filters: any) {
    const { data, total } = await this.repo.findByWorkspace(workspaceId, filters);

    return {
      data: data.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValue: log.oldValue,
        newValue: log.newValue,
        actor: log.actor
          ? {
              id: log.actor.id,
              firstName: log.actor.firstName,
              lastName: log.actor.lastName,
              username: log.actor.username,
            }
          : null,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async log(data: {
    workspaceId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.repo.create(data);
  }
}
