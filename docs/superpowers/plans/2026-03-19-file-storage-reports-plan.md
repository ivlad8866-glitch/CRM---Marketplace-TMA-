# Chunk 5: File Storage, Reports & Presence Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MinIO-based file attachments with pre-signed URLs and virus scan queue, workspace analytics/reports endpoints, and a scheduled job to clean stale presence entries from Redis.

**Architecture:** MinIO wraps S3-compatible storage behind a NestJS service. Upload flow: client calls `POST upload-url` → service creates FILE message + Attachment record atomically → returns pre-signed PUT URL → client uploads directly to MinIO → BullMQ job validates upload and updates scanStatus → WS event `attachment:ready` notifies room. Reports aggregate Ticket timestamps (firstResponseAt, resolvedAt, closedAt, slaDeadline) via raw Prisma queries. A BullMQ repeatable job sweeps stale presence entries from Redis via SCAN (not KEYS).

**Tech Stack:** NestJS 10, MinIO SDK 8, @nestjs/bullmq with BullMQ 5, Prisma 5, Redis/ioredis 5, Zod, Socket.IO

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/src/infrastructure/minio/minio.service.ts` | MinIO client wrapper: presigned URLs, delete, stat |
| Create | `backend/src/infrastructure/minio/minio.service.spec.ts` | Unit tests for MinIO service |
| Create | `backend/src/infrastructure/minio/minio.module.ts` | Global module exporting MinioService |
| Create | `backend/src/attachments/dto/attachment.dto.ts` | Re-exports requestUploadSchema from @crm/shared |
| Create | `backend/src/attachments/repository/attachments.repository.ts` | DB CRUD for Attachment model |
| Create | `backend/src/attachments/service/attachments.service.ts` | Upload URL gen (creates FILE message + attachment), download URL, delete |
| Create | `backend/src/attachments/service/attachments.service.spec.ts` | Unit tests |
| Create | `backend/src/attachments/controller/attachments.controller.ts` | REST endpoints under tickets |
| Create | `backend/src/attachments/consumer/attachment-scan.consumer.ts` | BullMQ worker: validates upload, updates scanStatus |
| Create | `backend/src/attachments/consumer/attachment-scan.consumer.spec.ts` | Unit tests for consumer |
| Create | `backend/src/attachments/attachments.module.ts` | Module wiring |
| Create | `backend/src/reports/dto/reports.dto.ts` | Zod schemas for date range, filters |
| Create | `backend/src/reports/service/reports.service.ts` | KPI aggregation, CSV export |
| Create | `backend/src/reports/service/reports.service.spec.ts` | Unit tests |
| Create | `backend/src/reports/controller/reports.controller.ts` | REST endpoints |
| Create | `backend/src/reports/reports.module.ts` | Module wiring |
| Create | `backend/src/jobs/presence-cleanup.processor.ts` | Repeatable job: sweep stale presence via SCAN |
| Create | `backend/src/jobs/presence-cleanup.processor.spec.ts` | Unit tests |
| Create | `backend/src/jobs/jobs.module.ts` | Registers BullMQ queues and processors |
| Modify | `backend/src/app.module.ts` | Add BullModule.forRoot, MinioModule, AttachmentsModule, ReportsModule, JobsModule |

---

## Task 1: MinIO Infrastructure Service

**Files:**
- Create: `backend/src/infrastructure/minio/minio.service.ts`
- Create: `backend/src/infrastructure/minio/minio.service.spec.ts`
- Create: `backend/src/infrastructure/minio/minio.module.ts`

- [ ] **Step 1: Write the failing test for MinioService**

```typescript
// backend/src/infrastructure/minio/minio.service.spec.ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';

jest.mock('minio', () => {
  const mockPresignedPutObject = jest.fn().mockResolvedValue('https://minio:9000/bucket/key?signed');
  const mockPresignedGetObject = jest.fn().mockResolvedValue('https://minio:9000/bucket/key?signed-get');
  const mockRemoveObject = jest.fn().mockResolvedValue(undefined);
  const mockStatObject = jest.fn().mockResolvedValue({ size: 1024, metaData: {} });
  return {
    Client: jest.fn().mockImplementation(() => ({
      presignedPutObject: mockPresignedPutObject,
      presignedGetObject: mockPresignedGetObject,
      removeObject: mockRemoveObject,
      statObject: mockStatObject,
    })),
    __mockFns: { mockPresignedPutObject, mockPresignedGetObject, mockRemoveObject, mockStatObject },
  };
});

const { __mockFns } = jest.requireMock('minio');

describe('MinioService', () => {
  let service: MinioService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const map: Record<string, string> = {
                MINIO_ENDPOINT: 'localhost',
                MINIO_PORT: '9000',
                MINIO_ACCESS_KEY: 'minioadmin',
                MINIO_SECRET_KEY: 'minioadmin',
                MINIO_BUCKET: 'crm-attachments',
                MINIO_USE_SSL: 'false',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(MinioService);
  });

  it('generates a presigned PUT URL', async () => {
    const url = await service.presignedPutUrl('workspace/file.pdf');
    expect(url).toContain('signed');
    expect(__mockFns.mockPresignedPutObject).toHaveBeenCalledWith(
      'crm-attachments',
      'workspace/file.pdf',
      300,
    );
  });

  it('generates a presigned GET URL', async () => {
    const url = await service.presignedGetUrl('workspace/file.pdf');
    expect(url).toContain('signed-get');
    expect(__mockFns.mockPresignedGetObject).toHaveBeenCalledWith(
      'crm-attachments',
      'workspace/file.pdf',
      3600,
    );
  });

  it('deletes an object', async () => {
    await service.deleteObject('workspace/file.pdf');
    expect(__mockFns.mockRemoveObject).toHaveBeenCalledWith('crm-attachments', 'workspace/file.pdf');
  });

  it('checks object existence via stat', async () => {
    const stat = await service.statObject('workspace/file.pdf');
    expect(stat.size).toBe(1024);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/infrastructure/minio/minio.service.spec.ts --no-coverage`
Expected: FAIL — cannot find module `./minio.service`

- [ ] **Step 3: Implement MinioService**

```typescript
// backend/src/infrastructure/minio/minio.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Injectable()
export class MinioService {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('MINIO_BUCKET');
    this.client = new Client({
      endPoint: this.config.getOrThrow<string>('MINIO_ENDPOINT'),
      port: parseInt(this.config.getOrThrow<string>('MINIO_PORT'), 10),
      accessKey: this.config.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.config.getOrThrow<string>('MINIO_SECRET_KEY'),
      useSSL: this.config.getOrThrow<string>('MINIO_USE_SSL') === 'true',
    });
  }

  async presignedPutUrl(key: string, expirySeconds = 300): Promise<string> {
    return this.client.presignedPutObject(this.bucket, key, expirySeconds);
  }

  async presignedGetUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async statObject(key: string) {
    return this.client.statObject(this.bucket, key);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/infrastructure/minio/minio.service.spec.ts --no-coverage`
Expected: 4 tests PASS

- [ ] **Step 5: Create MinioModule**

```typescript
// backend/src/infrastructure/minio/minio.module.ts
import { Global, Module } from '@nestjs/common';
import { MinioService } from './minio.service';

@Global()
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/infrastructure/minio/
git commit -m "feat: add MinIO infrastructure service with presigned URL support"
```

---

## Task 2: Attachments Module — Repository + Service + Controller

**Files:**
- Create: `backend/src/attachments/dto/attachment.dto.ts`
- Create: `backend/src/attachments/repository/attachments.repository.ts`
- Create: `backend/src/attachments/service/attachments.service.ts`
- Create: `backend/src/attachments/service/attachments.service.spec.ts`
- Create: `backend/src/attachments/controller/attachments.controller.ts`
- Create: `backend/src/attachments/attachments.module.ts`

### Design notes (addressing B2, B3, B4, W7, W10):

**Upload flow (fixes B2 — no FK violation):**
The `requestUpload` method creates a FILE-type Message and Attachment record in a single transaction. This ensures `messageId` is always a valid Message FK. The Attachment is linked to the newly created message. The client receives `{ attachmentId, messageId, uploadUrl, maxSize }`.

**Authorization (fixes B3):**
- `POST upload-url`: any authenticated workspace member (checked via ticket access).
- `GET download-url`: any workspace member, but blocks INFECTED/PENDING files (fixes B4).
- `DELETE`: ADMIN, WORKSPACE_OWNER, or the message author only.

**Schema reuse (fixes W7):** Import `requestUploadSchema` from `@crm/shared`.

**Storage key safety (fixes W10):** Use UUID-based keys, store `originalName` only in DB.

- [ ] **Step 1: Create DTO file (re-exports from @crm/shared)**

```typescript
// backend/src/attachments/dto/attachment.dto.ts
import { z } from 'zod';
import { requestUploadSchema } from '@crm/shared';

export { requestUploadSchema };
export type RequestUploadDto = z.infer<typeof requestUploadSchema>;
```

- [ ] **Step 2: Create AttachmentsRepository**

```typescript
// backend/src/attachments/repository/attachments.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a FILE message and its Attachment in a single transaction.
   * Uses the same eventSeq serialization as MessagesRepository.createWithSeq.
   */
  async createWithMessage(
    ticketId: string,
    workspaceId: string,
    authorUserId: string,
    authorType: string,
    attachment: {
      storageKey: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Lock ticket row for eventSeq serialization
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

      const [{ max }] = await tx.$queryRaw<{ max: number | null }[]>`
        SELECT MAX("eventSeq") as max FROM "Message" WHERE "ticketId" = ${ticketId}
      `;
      const nextSeq = (max ?? 0) + 1;

      const message = await tx.message.create({
        data: {
          type: 'FILE',
          authorType,
          text: attachment.originalName,
          ticketId,
          workspaceId,
          authorUserId,
          eventSeq: nextSeq,
        } as any,
      });

      const att = await tx.attachment.create({
        data: {
          storageKey: attachment.storageKey,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          messageId: message.id,
          workspaceId,
        },
      });

      return { message, attachment: att };
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.attachment.findFirst({
      where: { id, workspaceId },
      include: { message: { select: { ticketId: true, authorUserId: true } } },
    });
  }

  /** For internal use by scan consumer (trusted context, no workspace filter). */
  async findByIdInternal(id: string) {
    return this.prisma.attachment.findUnique({
      where: { id },
      include: { message: { select: { ticketId: true } } },
    });
  }

  async updateScanStatus(id: string, scanStatus: 'CLEAN' | 'INFECTED', previewUrl?: string | null) {
    return this.prisma.attachment.update({
      where: { id },
      data: { scanStatus, ...(previewUrl !== undefined ? { previewUrl } : {}) },
    });
  }

  async delete(id: string) {
    return this.prisma.attachment.delete({ where: { id } });
  }

  /** Generate a safe, UUID-based storage key (no user input in path). */
  static buildStorageKey(workspaceId: string, ticketId: string): string {
    return `${workspaceId}/${ticketId}/${randomUUID()}`;
  }
}
```

- [ ] **Step 3: Write failing test for AttachmentsService**

```typescript
// backend/src/attachments/service/attachments.service.spec.ts
import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsRepository } from '../repository/attachments.repository';
import { MinioService } from '../../infrastructure/minio/minio.service';

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let repo: jest.Mocked<AttachmentsRepository>;
  let minio: jest.Mocked<MinioService>;
  let scanQueue: { add: jest.Mock };

  beforeEach(async () => {
    scanQueue = { add: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        {
          provide: AttachmentsRepository,
          useValue: {
            createWithMessage: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: MinioService,
          useValue: {
            presignedPutUrl: jest.fn().mockResolvedValue('https://minio/put-url'),
            presignedGetUrl: jest.fn().mockResolvedValue('https://minio/get-url'),
            deleteObject: jest.fn(),
          },
        },
        {
          provide: 'BullQueue_attachment-scan',
          useValue: scanQueue,
        },
      ],
    }).compile();

    service = module.get(AttachmentsService);
    repo = module.get(AttachmentsRepository);
    minio = module.get(MinioService);
  });

  it('rejects disallowed MIME type', async () => {
    await expect(
      service.requestUpload('w1', 't1', 'u1', 'AGENT', {
        fileName: 'malware.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 1024,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects blocked file extension even with allowed MIME', async () => {
    await expect(
      service.requestUpload('w1', 't1', 'u1', 'AGENT', {
        fileName: 'script.bat',
        mimeType: 'text/plain',
        sizeBytes: 1024,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates FILE message + attachment and returns presigned URL', async () => {
    repo.createWithMessage.mockResolvedValue({
      message: { id: 'm1', type: 'FILE', ticketId: 't1' },
      attachment: {
        id: 'att-1', storageKey: 'w1/t1/uuid', originalName: 'doc.pdf',
        mimeType: 'application/pdf', sizeBytes: 5000, scanStatus: 'PENDING',
        previewUrl: null, createdAt: new Date(), messageId: 'm1', workspaceId: 'w1',
      },
    } as any);

    const result = await service.requestUpload('w1', 't1', 'u1', 'AGENT', {
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 5000,
    });

    expect(result.uploadUrl).toBe('https://minio/put-url');
    expect(result.attachmentId).toBe('att-1');
    expect(result.maxSize).toBe(50 * 1024 * 1024);
    expect(scanQueue.add).toHaveBeenCalled();
  });

  it('generates presigned download URL for CLEAN attachment', async () => {
    repo.findById.mockResolvedValue({
      id: 'att-1', storageKey: 'w1/t1/uuid', scanStatus: 'CLEAN',
      message: { ticketId: 't1', authorUserId: 'u1' },
    } as any);

    const url = await service.getDownloadUrl('att-1', 'w1');
    expect(url).toBe('https://minio/get-url');
  });

  it('blocks download of INFECTED attachment', async () => {
    repo.findById.mockResolvedValue({
      id: 'att-1', storageKey: 'w1/t1/uuid', scanStatus: 'INFECTED',
      message: { ticketId: 't1', authorUserId: 'u1' },
    } as any);

    await expect(service.getDownloadUrl('att-1', 'w1')).rejects.toThrow(ForbiddenException);
  });

  it('blocks download of PENDING attachment', async () => {
    repo.findById.mockResolvedValue({
      id: 'att-1', storageKey: 'w1/t1/uuid', scanStatus: 'PENDING',
      message: { ticketId: 't1', authorUserId: 'u1' },
    } as any);

    await expect(service.getDownloadUrl('att-1', 'w1')).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException for missing attachment', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getDownloadUrl('bad', 'w1')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend && npx jest src/attachments/service/attachments.service.spec.ts --no-coverage`
Expected: FAIL — cannot find module `./attachments.service`

- [ ] **Step 5: Implement AttachmentsService**

```typescript
// backend/src/attachments/service/attachments.service.ts
import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LIMITS } from '@crm/shared';
import { AttachmentsRepository } from '../repository/attachments.repository';
import { MinioService } from '../../infrastructure/minio/minio.service';
import { RequestUploadDto } from '../dto/attachment.dto';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly repo: AttachmentsRepository,
    private readonly minio: MinioService,
    @InjectQueue('attachment-scan') private readonly scanQueue: Queue,
  ) {}

  async requestUpload(
    workspaceId: string,
    ticketId: string,
    userId: string,
    userRole: string,
    dto: RequestUploadDto,
  ) {
    // Validate MIME type
    if (!LIMITS.ATTACHMENT_ALLOWED_MIMES.includes(dto.mimeType)) {
      throw new BadRequestException('FILE_TYPE_NOT_ALLOWED');
    }

    // Validate file extension
    const ext = dto.fileName.includes('.')
      ? '.' + dto.fileName.split('.').pop()!.toLowerCase()
      : '';
    if (LIMITS.ATTACHMENT_BLOCKED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('FILE_TYPE_NOT_ALLOWED');
    }

    // UUID-based storage key — no user input in path (prevents path traversal)
    const storageKey = AttachmentsRepository.buildStorageKey(workspaceId, ticketId);
    const authorType = userRole === 'CUSTOMER' ? 'CUSTOMER' : 'AGENT';

    // Create FILE message + Attachment atomically
    const { attachment } = await this.repo.createWithMessage(
      ticketId,
      workspaceId,
      userId,
      authorType,
      {
        storageKey,
        originalName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
    );

    // Generate presigned PUT URL
    const uploadUrl = await this.minio.presignedPutUrl(storageKey);

    // Enqueue scan job (delayed 5s to allow upload to complete)
    await this.scanQueue.add(
      'scan',
      { attachmentId: attachment.id, storageKey },
      { delay: 5000, attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    );

    return {
      attachmentId: attachment.id,
      uploadUrl,
      maxSize: LIMITS.ATTACHMENT_MAX_SIZE,
    };
  }

  async getDownloadUrl(attachmentId: string, workspaceId: string): Promise<string> {
    const attachment = await this.repo.findById(attachmentId, workspaceId);
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');

    // Block downloads of unscanned or infected files (B4 fix)
    if (attachment.scanStatus !== 'CLEAN') {
      throw new ForbiddenException(
        attachment.scanStatus === 'INFECTED' ? 'FILE_INFECTED' : 'FILE_SCAN_PENDING',
      );
    }

    return this.minio.presignedGetUrl(attachment.storageKey);
  }

  async deleteAttachment(
    attachmentId: string,
    workspaceId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const attachment = await this.repo.findById(attachmentId, workspaceId);
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');

    // Only author, ADMIN, or WORKSPACE_OWNER can delete (B3 fix)
    if (attachment.message.authorUserId !== userId && !['ADMIN', 'WORKSPACE_OWNER'].includes(userRole)) {
      throw new ForbiddenException('FORBIDDEN');
    }

    await this.minio.deleteObject(attachment.storageKey);
    await this.repo.delete(attachmentId);
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npx jest src/attachments/service/attachments.service.spec.ts --no-coverage`
Expected: 7 tests PASS

- [ ] **Step 7: Create AttachmentsController**

```typescript
// backend/src/attachments/controller/attachments.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { AttachmentsService } from '../service/attachments.service';
import { requestUploadSchema, RequestUploadDto } from '../dto/attachment.dto';

@Controller('workspaces/:wid/tickets/:tid/attachments')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('upload-url')
  async requestUpload(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(requestUploadSchema)) dto: RequestUploadDto,
  ) {
    return this.attachments.requestUpload(wid, tid, user.userId, user.role, dto);
  }

  @Get(':aid/download-url')
  async getDownloadUrl(
    @Param('wid') wid: string,
    @Param('aid') aid: string,
  ) {
    const url = await this.attachments.getDownloadUrl(aid, wid);
    return { downloadUrl: url };
  }

  @Delete(':aid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Param('wid') wid: string,
    @Param('aid') aid: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.attachments.deleteAttachment(aid, wid, user.userId, user.role);
  }
}
```

- [ ] **Step 8: Create AttachmentsModule (without consumer — added in Task 3)**

```typescript
// backend/src/attachments/attachments.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AttachmentsRepository } from './repository/attachments.repository';
import { AttachmentsService } from './service/attachments.service';
import { AttachmentsController } from './controller/attachments.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'attachment-scan' }),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsRepository, AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
```

- [ ] **Step 9: Commit**

```bash
git add backend/src/attachments/
git commit -m "feat: add attachments module with presigned upload/download, scan status checks"
```

---

## Task 3: Attachment Scan Consumer (BullMQ Worker)

**Files:**
- Create: `backend/src/attachments/consumer/attachment-scan.consumer.ts`
- Create: `backend/src/attachments/consumer/attachment-scan.consumer.spec.ts`
- Modify: `backend/src/attachments/attachments.module.ts` — add consumer + GatewayModule import

### Design notes (addressing B1, W5, W6, CP3):
- Consumer uses `findByIdInternal` (no workspace filter — trusted internal context, fixes B1)
- Emits `attachment:ready` using `GatewayEmitterService` (not ChatGateway directly, fixes W5)
- Gets `ticketId` from the message relation (not from messageId field, fixes W6)

- [ ] **Step 1: Write failing test for AttachmentScanConsumer**

```typescript
// backend/src/attachments/consumer/attachment-scan.consumer.spec.ts
import { Test } from '@nestjs/testing';
import { AttachmentScanConsumer } from './attachment-scan.consumer';
import { AttachmentsRepository } from '../repository/attachments.repository';
import { MinioService } from '../../infrastructure/minio/minio.service';
import { GatewayEmitterService } from '../../gateway/gateway-emitter.service';

describe('AttachmentScanConsumer', () => {
  let consumer: AttachmentScanConsumer;
  let repo: jest.Mocked<AttachmentsRepository>;
  let minio: jest.Mocked<MinioService>;
  let emitter: jest.Mocked<GatewayEmitterService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AttachmentScanConsumer,
        {
          provide: AttachmentsRepository,
          useValue: {
            findByIdInternal: jest.fn(),
            updateScanStatus: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: MinioService,
          useValue: {
            statObject: jest.fn().mockResolvedValue({ size: 1024 }),
            deleteObject: jest.fn(),
          },
        },
        {
          provide: GatewayEmitterService,
          useValue: { emitToTicket: jest.fn() },
        },
      ],
    }).compile();

    consumer = module.get(AttachmentScanConsumer);
    repo = module.get(AttachmentsRepository);
    minio = module.get(MinioService);
    emitter = module.get(GatewayEmitterService);
  });

  it('marks attachment as CLEAN when file exists and size matches', async () => {
    repo.findByIdInternal.mockResolvedValue({
      id: 'att-1',
      storageKey: 'w1/t1/uuid-key',
      sizeBytes: 1024,
      message: { ticketId: 't1' },
    } as any);

    const job = { data: { attachmentId: 'att-1', storageKey: 'w1/t1/uuid-key' } } as any;
    await consumer.process(job);

    expect(repo.updateScanStatus).toHaveBeenCalledWith('att-1', 'CLEAN', null);
    expect(emitter.emitToTicket).toHaveBeenCalledWith('t1', 'attachment:ready', {
      attachmentId: 'att-1',
      ticketId: 't1',
      scanStatus: 'CLEAN',
      previewUrl: null,
    });
  });

  it('marks as INFECTED when actual size greatly exceeds declared size', async () => {
    repo.findByIdInternal.mockResolvedValue({
      id: 'att-1',
      storageKey: 'w1/t1/uuid-key',
      sizeBytes: 500,
      message: { ticketId: 't1' },
    } as any);
    minio.statObject.mockResolvedValue({ size: 100_000_000 } as any);

    const job = { data: { attachmentId: 'att-1', storageKey: 'w1/t1/uuid-key' } } as any;
    await consumer.process(job);

    expect(repo.updateScanStatus).toHaveBeenCalledWith('att-1', 'INFECTED', null);
  });

  it('deletes DB record when file not found in storage', async () => {
    repo.findByIdInternal.mockResolvedValue({
      id: 'att-1',
      storageKey: 'w1/t1/uuid-key',
      sizeBytes: 1024,
      message: { ticketId: 't1' },
    } as any);
    minio.statObject.mockRejectedValue(new Error('Not found'));

    const job = { data: { attachmentId: 'att-1', storageKey: 'w1/t1/uuid-key' } } as any;
    await consumer.process(job);

    expect(repo.delete).toHaveBeenCalledWith('att-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/attachments/consumer/attachment-scan.consumer.spec.ts --no-coverage`
Expected: FAIL — cannot find module `./attachment-scan.consumer`

- [ ] **Step 3: Implement AttachmentScanConsumer**

```typescript
// backend/src/attachments/consumer/attachment-scan.consumer.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LIMITS } from '@crm/shared';
import { AttachmentsRepository } from '../repository/attachments.repository';
import { MinioService } from '../../infrastructure/minio/minio.service';
import { GatewayEmitterService } from '../../gateway/gateway-emitter.service';

interface ScanJobData {
  attachmentId: string;
  storageKey: string;
}

@Processor('attachment-scan')
export class AttachmentScanConsumer extends WorkerHost {
  private readonly logger = new Logger(AttachmentScanConsumer.name);

  constructor(
    private readonly repo: AttachmentsRepository,
    private readonly minio: MinioService,
    private readonly emitter: GatewayEmitterService,
  ) {
    super();
  }

  async process(job: Job<ScanJobData>) {
    const { attachmentId, storageKey } = job.data;

    // Internal lookup — no workspace scoping needed (trusted background job, B1 fix)
    const attachment = await this.repo.findByIdInternal(attachmentId);
    if (!attachment) {
      this.logger.warn(`Attachment ${attachmentId} not found in DB, skipping scan`);
      return;
    }

    const ticketId = attachment.message.ticketId;

    try {
      const stat = await this.minio.statObject(storageKey);

      // Size validation: actual size must not exceed declared + 10% tolerance
      const maxAllowed = Math.min(attachment.sizeBytes * 1.1, LIMITS.ATTACHMENT_MAX_SIZE);
      const scanStatus = stat.size > maxAllowed ? 'INFECTED' : 'CLEAN';

      await this.repo.updateScanStatus(attachmentId, scanStatus as 'CLEAN' | 'INFECTED', null);

      // Notify ticket room via GatewayEmitterService (W5/W6 fix)
      this.emitter.emitToTicket(ticketId, 'attachment:ready', {
        attachmentId,
        ticketId,
        scanStatus,
        previewUrl: null,
      });
    } catch (err) {
      this.logger.error(`File not found in storage for attachment ${attachmentId}, removing DB record`);
      await this.repo.delete(attachmentId);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/attachments/consumer/attachment-scan.consumer.spec.ts --no-coverage`
Expected: 3 tests PASS

- [ ] **Step 5: Update AttachmentsModule — add consumer + GatewayModule import (CP3 fix)**

```typescript
// backend/src/attachments/attachments.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GatewayModule } from '../gateway/gateway.module';
import { AttachmentsRepository } from './repository/attachments.repository';
import { AttachmentsService } from './service/attachments.service';
import { AttachmentsController } from './controller/attachments.controller';
import { AttachmentScanConsumer } from './consumer/attachment-scan.consumer';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'attachment-scan' }),
    GatewayModule,
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsRepository, AttachmentsService, AttachmentScanConsumer],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/attachments/
git commit -m "feat: add BullMQ attachment scan consumer with size validation and WS notification"
```

---

## Task 4: Reports Module — KPI Aggregation + CSV Export

**Files:**
- Create: `backend/src/reports/dto/reports.dto.ts`
- Create: `backend/src/reports/service/reports.service.ts`
- Create: `backend/src/reports/service/reports.service.spec.ts`
- Create: `backend/src/reports/controller/reports.controller.ts`
- Create: `backend/src/reports/reports.module.ts`

### Design notes (addressing B6, W1, W9):
- **CSV injection prevention (B6):** Prefix cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` with a tab character.
- **Size limit (B6):** `findMany` uses `take: 10_000` limit.
- **Correct field names (W1):** `ticketNumber` (not `clientNumber`), `title` (not `subject`).
- **Null lastName (W9):** `.filter(Boolean).join(' ')`.

- [ ] **Step 1: Create DTO schemas**

```typescript
// backend/src/reports/dto/reports.dto.ts
import { z } from 'zod';

export const reportQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  agentId: z.string().optional(),
  serviceId: z.string().optional(),
});

export type ReportQueryDto = z.infer<typeof reportQuerySchema>;
```

- [ ] **Step 2: Write failing test for ReportsService**

```typescript
// backend/src/reports/service/reports.service.spec.ts
import { Test } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: {
            ticket: {
              findMany: jest.fn(),
              groupBy: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ReportsService);
    prisma = module.get(PrismaService);
  });

  it('returns KPI summary with correct structure', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        total_tickets: 100n,
        resolved_tickets: 80n,
        avg_first_response_minutes: 15.5,
        avg_resolution_minutes: 120.3,
        sla_breached: 5n,
      },
    ]);
    prisma.ticket.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { id: 10 } },
      { status: 'IN_PROGRESS', _count: { id: 30 } },
      { status: 'RESOLVED', _count: { id: 80 } },
    ]);

    const result = await service.getKpiSummary('w1', {
      from: '2026-03-01T00:00:00Z',
      to: '2026-03-19T23:59:59Z',
    });

    expect(result).toHaveProperty('totalTickets', 100);
    expect(result).toHaveProperty('resolvedTickets', 80);
    expect(result).toHaveProperty('avgFirstResponseMinutes');
    expect(result).toHaveProperty('avgResolutionMinutes');
    expect(result).toHaveProperty('slaBreached', 5);
    expect(result).toHaveProperty('byStatus');
    expect(result.byStatus).toHaveLength(3);
  });

  it('generates CSV with correct field names and sanitized content', async () => {
    prisma.ticket.findMany.mockResolvedValue([
      {
        id: 't1',
        ticketNumber: 'TK-101',
        title: 'Test ticket',
        status: 'RESOLVED',
        priority: 'NORMAL',
        createdAt: new Date('2026-03-10'),
        resolvedAt: new Date('2026-03-11'),
        firstResponseAt: new Date('2026-03-10'),
        closedAt: null,
        slaDeadline: new Date('2026-03-12'),
        assignee: { user: { firstName: 'Agent', lastName: 'Smith' } },
        service: { name: 'Support' },
        customer: { user: { firstName: 'John', lastName: null } },
      },
      {
        id: 't2',
        ticketNumber: 'TK-102',
        title: '=HYPERLINK("evil")',
        status: 'NEW',
        priority: 'HIGH',
        createdAt: new Date('2026-03-11'),
        resolvedAt: null,
        firstResponseAt: null,
        closedAt: null,
        slaDeadline: null,
        assignee: null,
        service: null,
        customer: { user: { firstName: 'Jane', lastName: 'Doe' } },
      },
    ]);

    const csv = await service.exportTicketsCsv('w1', {
      from: '2026-03-01T00:00:00Z',
      to: '2026-03-19T23:59:59Z',
    });

    expect(csv).toContain('id,ticketNumber,title');
    expect(csv).toContain('t1');
    expect(csv).toContain('Agent Smith');
    expect(csv).toContain('John'); // no "null" for missing lastName
    expect(csv).not.toContain('=HYPERLINK'); // CSV injection sanitized
  });

  it('applies agentId and serviceId filters', async () => {
    prisma.ticket.findMany.mockResolvedValue([]);

    await service.exportTicketsCsv('w1', {
      from: '2026-03-01T00:00:00Z',
      to: '2026-03-19T23:59:59Z',
      agentId: 'agent-1',
      serviceId: 'svc-1',
    });

    const call = prisma.ticket.findMany.mock.calls[0][0];
    expect(call.where.assigneeId).toBe('agent-1');
    expect(call.where.serviceId).toBe('svc-1');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx jest src/reports/service/reports.service.spec.ts --no-coverage`
Expected: FAIL — cannot find module `./reports.service`

- [ ] **Step 4: Implement ReportsService**

```typescript
// backend/src/reports/service/reports.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ReportQueryDto } from '../dto/reports.dto';

const CSV_EXPORT_LIMIT = 10_000;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpiSummary(workspaceId: string, query: ReportQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const [rawKpi] = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::bigint AS total_tickets,
        COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::bigint AS resolved_tickets,
        AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60)
          FILTER (WHERE "firstResponseAt" IS NOT NULL) AS avg_first_response_minutes,
        AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60)
          FILTER (WHERE "resolvedAt" IS NOT NULL) AS avg_resolution_minutes,
        COUNT(*) FILTER (WHERE "slaDeadline" IS NOT NULL AND "resolvedAt" > "slaDeadline")::bigint AS sla_breached
      FROM "Ticket"
      WHERE "workspaceId" = ${workspaceId}
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
        AND "isDeleted" = false
    `;

    const byStatus = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: {
        workspaceId,
        createdAt: { gte: from, lte: to },
        isDeleted: false,
      },
      _count: { id: true },
    });

    return {
      totalTickets: Number(rawKpi.total_tickets),
      resolvedTickets: Number(rawKpi.resolved_tickets),
      avgFirstResponseMinutes: rawKpi.avg_first_response_minutes
        ? Math.round(rawKpi.avg_first_response_minutes * 10) / 10
        : null,
      avgResolutionMinutes: rawKpi.avg_resolution_minutes
        ? Math.round(rawKpi.avg_resolution_minutes * 10) / 10
        : null,
      slaBreached: Number(rawKpi.sla_breached),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  }

  async exportTicketsCsv(workspaceId: string, query: ReportQueryDto): Promise<string> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        workspaceId,
        createdAt: { gte: from, lte: to },
        isDeleted: false,
        ...(query.agentId ? { assigneeId: query.agentId } : {}),
        ...(query.serviceId ? { serviceId: query.serviceId } : {}),
      },
      include: {
        assignee: { select: { user: { select: { firstName: true, lastName: true } } } },
        service: { select: { name: true } },
        customer: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: CSV_EXPORT_LIMIT,
    });

    const header = 'id,ticketNumber,title,status,priority,assignee,service,customer,createdAt,firstResponseAt,resolvedAt,closedAt,slaDeadline';

    const rows = tickets.map((t) => {
      const assigneeName = t.assignee
        ? [t.assignee.user.firstName, t.assignee.user.lastName].filter(Boolean).join(' ')
        : '';
      const customerName = t.customer
        ? [t.customer.user.firstName, t.customer.user.lastName].filter(Boolean).join(' ')
        : '';
      const serviceName = t.service?.name ?? '';

      return [
        t.id,
        t.ticketNumber,
        csvSafe(t.title ?? ''),
        t.status,
        t.priority,
        csvSafe(assigneeName),
        csvSafe(serviceName),
        csvSafe(customerName),
        t.createdAt.toISOString(),
        t.firstResponseAt?.toISOString() ?? '',
        t.resolvedAt?.toISOString() ?? '',
        t.closedAt?.toISOString() ?? '',
        t.slaDeadline?.toISOString() ?? '',
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }
}

/** Sanitize a value for CSV: escape quotes, prevent formula injection (B6 fix). */
function csvSafe(value: string): string {
  const escaped = value.replace(/"/g, '""');
  const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];
  const needsSanitize = DANGEROUS_PREFIXES.some((p) => escaped.startsWith(p));
  return needsSanitize ? `"\t${escaped}"` : `"${escaped}"`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/reports/service/reports.service.spec.ts --no-coverage`
Expected: 3 tests PASS

- [ ] **Step 6: Create ReportsController**

```typescript
// backend/src/reports/controller/reports.controller.ts
import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReportsService } from '../service/reports.service';
import { reportQuerySchema, ReportQueryDto } from '../dto/reports.dto';

@Controller('workspaces/:wid/reports')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
@Roles('WORKSPACE_OWNER', 'ADMIN')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('kpi')
  async getKpi(
    @Param('wid') wid: string,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQueryDto,
  ) {
    return this.reports.getKpiSummary(wid, query);
  }

  @Get('tickets/csv')
  async exportCsv(
    @Param('wid') wid: string,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.reports.exportTicketsCsv(wid, query);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="tickets-${query.from.slice(0, 10)}-${query.to.slice(0, 10)}.csv"`,
    });
    res.send(csv);
  }
}
```

- [ ] **Step 7: Create ReportsModule**

```typescript
// backend/src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { ReportsService } from './service/reports.service';
import { ReportsController } from './controller/reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/reports/
git commit -m "feat: add reports module with KPI summary and CSV export (injection-safe)"
```

---

## Task 5: Presence Cleanup Job + BullMQ Global Setup

**Files:**
- Create: `backend/src/jobs/presence-cleanup.processor.ts`
- Create: `backend/src/jobs/presence-cleanup.processor.spec.ts`
- Create: `backend/src/jobs/jobs.module.ts`
- Modify: `backend/src/app.module.ts`

### Design notes (addressing B5, W2/W3, W5, CP2):
- **SCAN instead of KEYS (B5):** Use Redis `scanStream` with cursor iteration to find `ws:members:*` keys.
- **@nestjs/bullmq (W2/W3):** Install `@nestjs/bullmq` and use its decorators (`WorkerHost`, `Processor`). Parse `REDIS_URL` into host/port for BullMQ connection config.
- **GatewayEmitterService (W5):** Inject `GatewayEmitterService` instead of `ChatGateway` directly.

- [ ] **Step 1: Install @nestjs/bullmq**

Run: `cd backend && pnpm add @nestjs/bullmq`

Note: `bullmq` is already installed. `@nestjs/bullmq` is the NestJS wrapper for it.

- [ ] **Step 2: Write failing test for PresenceCleanupProcessor**

```typescript
// backend/src/jobs/presence-cleanup.processor.spec.ts
import { Test } from '@nestjs/testing';
import { PresenceCleanupProcessor } from './presence-cleanup.processor';
import { RedisService } from '../infrastructure/redis/redis.service';
import { GatewayEmitterService } from '../gateway/gateway-emitter.service';

describe('PresenceCleanupProcessor', () => {
  let processor: PresenceCleanupProcessor;
  let redis: any;
  let emitter: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PresenceCleanupProcessor,
        {
          provide: RedisService,
          useValue: {
            scanStream: jest.fn(),
            smembers: jest.fn(),
            exists: jest.fn(),
            srem: jest.fn(),
          },
        },
        {
          provide: GatewayEmitterService,
          useValue: { emitToWorkspace: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get(PresenceCleanupProcessor);
    redis = module.get(RedisService);
    emitter = module.get(GatewayEmitterService);
  });

  it('removes stale members and broadcasts offline via emitter', async () => {
    // Mock scanStream to return an async iterable of key batches
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield ['ws:members:w1', 'ws:members:w2'];
      },
    };
    redis.scanStream.mockReturnValue(mockStream);
    redis.smembers
      .mockResolvedValueOnce(['u1', 'u2']) // w1 members
      .mockResolvedValueOnce(['u3']);       // w2 members
    redis.exists
      .mockResolvedValueOnce(1)  // u1 online
      .mockResolvedValueOnce(0)  // u2 offline (stale)
      .mockResolvedValueOnce(1); // u3 online

    await processor.process({} as any);

    expect(redis.srem).toHaveBeenCalledWith('ws:members:w1', 'u2');
    expect(redis.srem).toHaveBeenCalledTimes(1);
    expect(emitter.emitToWorkspace).toHaveBeenCalledWith('w1', 'presence:update', {
      userId: 'u2',
      status: 'offline',
    });
  });

  it('does nothing when no workspace sets exist', async () => {
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        // yields nothing
      },
    };
    redis.scanStream.mockReturnValue(mockStream);

    await processor.process({} as any);

    expect(redis.smembers).not.toHaveBeenCalled();
    expect(redis.srem).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx jest src/jobs/presence-cleanup.processor.spec.ts --no-coverage`
Expected: FAIL — cannot find module `./presence-cleanup.processor`

- [ ] **Step 4: Implement PresenceCleanupProcessor**

```typescript
// backend/src/jobs/presence-cleanup.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RedisService } from '../infrastructure/redis/redis.service';
import { GatewayEmitterService } from '../gateway/gateway-emitter.service';

@Processor('presence-cleanup')
export class PresenceCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(PresenceCleanupProcessor.name);

  constructor(
    private readonly redis: RedisService,
    private readonly emitter: GatewayEmitterService,
  ) {
    super();
  }

  async process(_job: Job) {
    // Use SCAN instead of KEYS to avoid blocking Redis (B5 fix)
    const stream = this.redis.scanStream({ match: 'ws:members:*', count: 100 });

    for await (const keys of stream) {
      for (const key of keys as string[]) {
        const workspaceId = key.replace('ws:members:', '');
        const members = await this.redis.smembers(key);

        for (const userId of members) {
          const isOnline = await this.redis.exists(`online:${userId}`);
          if (!isOnline) {
            await this.redis.srem(key, userId);
            this.logger.debug(`Removed stale presence: user=${userId} workspace=${workspaceId}`);

            // Broadcast offline via GatewayEmitterService (W5 fix)
            this.emitter.emitToWorkspace(workspaceId, 'presence:update', {
              userId,
              status: 'offline',
            });
          }
        }
      }
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/jobs/presence-cleanup.processor.spec.ts --no-coverage`
Expected: 2 tests PASS

- [ ] **Step 6: Create JobsModule with repeatable job**

```typescript
// backend/src/jobs/jobs.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GatewayModule } from '../gateway/gateway.module';
import { PresenceCleanupProcessor } from './presence-cleanup.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'presence-cleanup' }),
    GatewayModule,
  ],
  providers: [PresenceCleanupProcessor],
})
export class JobsModule implements OnModuleInit {
  constructor(
    @InjectQueue('presence-cleanup') private readonly cleanupQueue: Queue,
  ) {}

  async onModuleInit() {
    // Remove old repeatable jobs, add fresh one
    const existing = await this.cleanupQueue.getRepeatableJobs();
    for (const job of existing) {
      await this.cleanupQueue.removeRepeatableByKey(job.key);
    }

    await this.cleanupQueue.add('sweep', {}, {
      repeat: { every: 60_000 }, // every 60 seconds
    });
  }
}
```

- [ ] **Step 7: Update app.module.ts — add BullModule.forRoot + new modules**

Modify `backend/src/app.module.ts`:

Add imports:
```typescript
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { MinioModule } from './infrastructure/minio/minio.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ReportsModule } from './reports/reports.module';
import { JobsModule } from './jobs/jobs.module';
```

Add to the `imports` array (after `RedisModule`):
```typescript
BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const url = new URL(config.getOrThrow<string>('REDIS_URL'));
    return {
      connection: {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
      },
    };
  },
}),
MinioModule,
AttachmentsModule,
ReportsModule,
JobsModule,
```

- [ ] **Step 8: Run full test suite**

Run: `cd backend && npx jest --no-coverage`
Expected: All tests pass (existing ~65 + new ~19 = ~84 tests)

- [ ] **Step 9: Commit**

```bash
git add backend/src/jobs/ backend/src/app.module.ts
git commit -m "feat: add presence cleanup job, BullMQ setup, wire all Chunk 5 modules"
```

---

## Task 6: Integration Verification & TypeScript Check

- [ ] **Step 1: Run TypeScript compiler check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Fix any TypeScript errors**

Common issues to watch for:
- `@nestjs/bullmq` import paths (vs `@nestjs/bull`)
- Prisma types for `$queryRaw` results
- `InjectQueue` token format from `@nestjs/bullmq`
- `WorkerHost` import if `@nestjs/bullmq` version differs

- [ ] **Step 3: Run full test suite one final time**

Run: `cd backend && npx jest --no-coverage --forceExit`
Expected: All tests pass

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors in Chunk 5 integration"
```
