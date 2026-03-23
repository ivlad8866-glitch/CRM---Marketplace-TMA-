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
