import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

describe('UploadService', () => {
    let service: UploadService;
    let configService: ConfigService;
    const s3Mock = mockClient(S3Client);

    beforeEach(async () => {
        s3Mock.reset();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UploadService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            switch (key) {
                                case 'MINIO_BUCKET_NAME':
                                    return 'test-bucket';
                                case 'MINIO_ENDPOINT':
                                    return 'localhost';
                                case 'MINIO_PORT':
                                    return 9000;
                                case 'MINIO_USE_SSL':
                                    return 'false';
                                case 'MINIO_ACCESS_KEY':
                                    return 'test-access-key';
                                case 'MINIO_SECRET_KEY':
                                    return 'test-secret-key';
                                default:
                                    return null;
                            }
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<UploadService>(UploadService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('uploadFile', () => {
        it('should upload file and return public URL', async () => {
            const mockFile = {
                originalname: 'test.jpg',
                buffer: Buffer.from('test'),
                mimetype: 'image/jpeg',
            } as Express.Multer.File;

            s3Mock.on(PutObjectCommand).resolves({});

            const result = await service.uploadFile(mockFile);

            expect(result).toMatch(
                /^http:\/\/localhost:9000\/test-bucket\/[a-f0-9-]+\.jpg$/,
            );
            expect(s3Mock.calls()).toHaveLength(1);
            const callArgs = s3Mock.call(0).args[0].input;
            expect(callArgs).toEqual(
                expect.objectContaining({
                    Bucket: 'test-bucket',
                    Body: mockFile.buffer,
                    ContentType: 'image/jpeg',
                }),
            );
        });

        it('should throw error if upload fails', async () => {
            const mockFile = {
                originalname: 'test.jpg',
                buffer: Buffer.from('test'),
                mimetype: 'image/jpeg',
            } as Express.Multer.File;

            s3Mock.on(PutObjectCommand).rejects(new Error('Upload failed'));

            await expect(service.uploadFile(mockFile)).rejects.toThrow(
                'Upload failed',
            );
        });
    });
});
