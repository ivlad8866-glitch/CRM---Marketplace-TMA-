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
