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
  private readonly bucketName = 'study-files';
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

  private readonly maxFileSize = 10 * 1024 * 1024;

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
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    try {
      const timestamp = Date.now();
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${userId}/${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new InternalServerErrorException(
          'Failed to upload file to storage',
        );
      }

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
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('File upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const urlParts = fileUrl.split('/storage/v1/object/public/');
      if (urlParts.length < 2) {
        throw new BadRequestException('Invalid file URL');
      }

      const filePath = urlParts[1];

      const { error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        throw new InternalServerErrorException('Failed to delete file');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('File delete error:', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async getSignedUrl(
    fileUrl: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const urlParts = fileUrl.split('/storage/v1/object/public/');
      if (urlParts.length < 2) {
        throw new BadRequestException('Invalid file URL');
      }

      const filePath = urlParts[1];

      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Supabase signed URL error:', error);
        throw new InternalServerErrorException('Failed to create signed URL');
      }

      return data.signedUrl;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Get signed URL error:', error);
      throw new InternalServerErrorException('Failed to get signed URL');
    }
  }
}
