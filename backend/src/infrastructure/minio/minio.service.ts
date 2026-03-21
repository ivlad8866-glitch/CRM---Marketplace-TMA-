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
