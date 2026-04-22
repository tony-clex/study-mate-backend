/// <reference types="node" />
/// <reference types="node" />
import { ProcessingService } from '../documents/processing.service';
import { AiService } from '../ai/ai.service';
export interface UploadedFile {
  id?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}
export declare class FileUploadService {
  private readonly processingService;
  private readonly aiService;
  private readonly logger;
  private readonly bucketName;
  private readonly allowedMimeTypes;
  private readonly maxFileSize;
  constructor(processingService: ProcessingService, aiService: AiService);
  uploadFile(
    userId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    folder?: string,
  ): Promise<UploadedFile>;
  deleteFile(fileUrl: string): Promise<void>;
  getSignedUrl(fileUrl: string, expiresIn?: number): Promise<string>;
}
