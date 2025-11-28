import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME') || '';
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const port = this.configService.get<number>('MINIO_PORT');
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';

    this.s3Client = new S3Client({
      region: 'us-east-1', // MinIO requires a region, but it doesn't matter which one
      endpoint: `http${useSSL ? 's' : ''}://${endpoint}:${port}`,
      forcePathStyle: true, // Required for MinIO
      credentials: {
        accessKeyId: this.configService.get<string>('MINIO_ACCESS_KEY') || '',
        secretAccessKey:
          this.configService.get<string>('MINIO_SECRET_KEY') || '',
      },
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      // Construct public URL
      const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
      const port = this.configService.get<number>('MINIO_PORT');
      const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';

      // If running locally with Docker, localhost might be needed for browser access
      // but internal service communication uses container name.
      // For now, we assume the endpoint provided is accessible by the browser.
      return `http${useSSL ? 's' : ''}://${endpoint}:${port}/${this.bucketName}/${fileName}`;
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
