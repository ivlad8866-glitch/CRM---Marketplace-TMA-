import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomFieldsRepository } from '../repository/custom-fields.repository';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly repo: CustomFieldsRepository) {}

  async list(workspaceId: string) {
    const fields = await this.repo.findByWorkspace(workspaceId);
    return fields.map((f) => ({
      id: f.id,
      name: f.name,
      label: f.label,
      fieldType: f.fieldType,
      options: f.options,
      isRequired: f.isRequired,
      sortOrder: f.sortOrder,
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async create(workspaceId: string, dto: any) {
    const field = await this.repo.create(workspaceId, dto);
    return {
      id: field.id,
      name: field.name,
      label: field.label,
      fieldType: field.fieldType,
      options: field.options,
      isRequired: field.isRequired,
      sortOrder: field.sortOrder,
      createdAt: field.createdAt.toISOString(),
    };
  }

  async update(workspaceId: string, fieldId: string, dto: any) {
    const existing = await this.repo.findById(fieldId, workspaceId);
    if (!existing) throw new NotFoundException('NOT_FOUND');
    const updated = await this.repo.update(fieldId, dto);
    return {
      id: updated.id,
      name: updated.name,
      label: updated.label,
      fieldType: updated.fieldType,
      options: updated.options,
      isRequired: updated.isRequired,
      sortOrder: updated.sortOrder,
    };
  }

  async remove(workspaceId: string, fieldId: string) {
    const existing = await this.repo.findById(fieldId, workspaceId);
    if (!existing) throw new NotFoundException('NOT_FOUND');
    await this.repo.remove(fieldId);
  }
}
