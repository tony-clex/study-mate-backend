import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { supabaseAdmin } from '../config/supabase.client';

export interface UploadedFile {
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

@Injectable()
export class FileUploadService {
  // FIX: Matches your Supabase Dashboard bucket name exactly
  private readonly bucketName = 'session-files';

  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  async uploadFile(
    userId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    folder: string = 'uploads',
  ): Promise<UploadedFile> {
    // 1. Validation
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File too large. Maximum size is 10MB`);
    }

    try {
      // 2. Generate Path: Matches the "User ID Folder" policy we set up
      const timestamp = Date.now();
      const fileExt = file.originalname.split('.').pop();
      const randomString = Math.random().toString(36).substring(7);
      const fileName = `${userId}/${folder}/${timestamp}-${randomString}.${fileExt}`;

      console.log(
        `[Storage] Uploading to bucket: ${this.bucketName} path: ${fileName}`,
      );

      // 3. Perform Upload
      const { error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true, // Set to true to allow replacing files if needed
        });

      if (error) {
        console.error('Supabase upload error detail:', error);
        throw new InternalServerErrorException(
          `Supabase upload failed: ${error.message}`,
        );
      }

      // 4. Generate URL
      const { data: urlData } = supabaseAdmin.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return {
        file_name: file.originalname,
        file_url: urlData.publicUrl,
        file_type: file.mimetype,
        file_size: file.size,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('File upload service error:', error);
      throw new InternalServerErrorException('Failed to process file upload');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the path after the bucket name
      // This is safer than splitting by hardcoded strings
      const bucketSearchStr = `${this.bucketName}/`;
      const startIndex = fileUrl.indexOf(bucketSearchStr);

      if (startIndex === -1) {
        throw new BadRequestException('Invalid file URL for this bucket');
      }

      const filePath = fileUrl.substring(startIndex + bucketSearchStr.length);

      const { error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        throw new InternalServerErrorException(
          'Failed to delete file from Supabase',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('File delete error:', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async getSignedUrl(
    fileUrl: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const bucketSearchStr = `${this.bucketName}/`;
      const startIndex = fileUrl.indexOf(bucketSearchStr);

      if (startIndex === -1) {
        throw new BadRequestException('Invalid file URL');
      }

      const filePath = fileUrl.substring(startIndex + bucketSearchStr.length);

      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error || !data) {
        console.error('Supabase signed URL error:', error);
        throw new InternalServerErrorException('Failed to create signed URL');
      }

      return data.signedUrl;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to get signed URL');
    }
  }
}
