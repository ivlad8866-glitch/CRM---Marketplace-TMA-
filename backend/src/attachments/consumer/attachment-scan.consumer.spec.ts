import { Test } from '@nestjs/testing';
import { AttachmentScanConsumer } from './attachment-scan.consumer';
import { AttachmentsRepository } from '../repository/attachments.repository';
import { MinioService } from '../../infrastructure/minio/minio.service';
import { GatewayEmitterService } from '../../gateway/gateway-emitter.service';
import { Job } from 'bullmq';

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
            statObject: jest.fn(),
            deleteObject: jest.fn(),
          },
        },
        {
          provide: GatewayEmitterService,
          useValue: {
            emitToTicket: jest.fn(),
          },
        },
      ],
    }).compile();

    consumer = module.get(AttachmentScanConsumer);
    repo = module.get(AttachmentsRepository);
    minio = module.get(MinioService);
    emitter = module.get(GatewayEmitterService);
  });

  function makeJob(data: { attachmentId: string; storageKey: string }): Job {
    return { data } as Job;
  }

  it('marks attachment as CLEAN when file exists and size matches', async () => {
    repo.findByIdInternal.mockResolvedValue({
      id: 'att-1',
      sizeBytes: 1000,
      message: { ticketId: 't1' },
    } as any);

    // size within 110% of declared size (1000 * 1.1 = 1100) — return 900
    minio.statObject.mockResolvedValue({ size: 900 } as any);
    repo.updateScanStatus.mockResolvedValue({} as any);

    await consumer.process(makeJob({ attachmentId: 'att-1', storageKey: 'w1/t1/uuid' }));

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
      id: 'att-2',
      sizeBytes: 1000,
      message: { ticketId: 't1' },
    } as any);

    // size far exceeds 110% of declared size — suspicious / potentially malicious
    minio.statObject.mockResolvedValue({ size: 999_999_999 } as any);
    repo.updateScanStatus.mockResolvedValue({} as any);

    await consumer.process(makeJob({ attachmentId: 'att-2', storageKey: 'w1/t1/uuid' }));

    expect(repo.updateScanStatus).toHaveBeenCalledWith('att-2', 'INFECTED', null);
    expect(emitter.emitToTicket).toHaveBeenCalledWith('t1', 'attachment:ready', {
      attachmentId: 'att-2',
      ticketId: 't1',
      scanStatus: 'INFECTED',
      previewUrl: null,
    });
  });

  it('deletes DB record when file not found in storage', async () => {
    repo.findByIdInternal.mockResolvedValue({
      id: 'att-3',
      sizeBytes: 1000,
      message: { ticketId: 't1' },
    } as any);

    minio.statObject.mockRejectedValue(new Error('Not Found'));
    repo.delete.mockResolvedValue({} as any);

    await consumer.process(makeJob({ attachmentId: 'att-3', storageKey: 'w1/t1/missing' }));

    expect(repo.delete).toHaveBeenCalledWith('att-3');
    expect(repo.updateScanStatus).not.toHaveBeenCalled();
    expect(emitter.emitToTicket).not.toHaveBeenCalled();
  });
});
