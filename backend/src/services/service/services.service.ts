import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ServicesRepository } from '../repository/services.repository';
import { MinioService } from '../../infrastructure/minio/minio.service';

const COVER_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
// 1-year presigned GET URL — long enough for cover images
const COVER_GET_EXPIRY_SECONDS = 365 * 24 * 3600;
// 5-minute window to complete the upload
const COVER_PUT_EXPIRY_SECONDS = 300;

@Injectable()
export class ServicesService {
  constructor(
    private readonly repo: ServicesRepository,
    private readonly minio: MinioService,
  ) {}

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

  /**
   * Generate a presigned PUT URL so the client can upload a cover image directly
   * to MinIO, then returns a long-lived presigned GET URL to store on the service.
   */
  async requestCoverUploadUrl(
    workspaceId: string,
    mimeType: string,
    fileName: string,
  ): Promise<{ uploadUrl: string; downloadUrl: string; storageKey: string }> {
    if (!COVER_ALLOWED_MIMES.includes(mimeType as any)) {
      throw new BadRequestException('IMAGE_TYPE_NOT_ALLOWED');
    }

    const ext = fileName.includes('.')
      ? fileName.split('.').pop()!.toLowerCase()
      : 'jpg';

    // UUID-based key — no user-controlled input in the path
    const storageKey = `covers/${workspaceId}/${randomUUID()}.${ext}`;

    const [uploadUrl, downloadUrl] = await Promise.all([
      this.minio.presignedPutUrl(storageKey, COVER_PUT_EXPIRY_SECONDS),
      this.minio.presignedGetUrl(storageKey, COVER_GET_EXPIRY_SECONDS),
    ]);

    return { uploadUrl, downloadUrl, storageKey };
  }

  private formatResponse(s: any) {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      coverUrl: s.coverUrl ?? null,
      startParam: s.startParam,
      slaMinutes: s.slaMinutes,
      isActive: s.isActive,
      routingMode: s.routingMode,
      version: s.version,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
