import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  FileUploadService,
  UploadedFile as UploadedFileType,
} from './file-upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { memoryStorage } from 'multer';

interface AuthenticatedRequest {
  user: { sub: string; email: string };
}

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('api/upload')
@UseGuards(JwtAuthGuard)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadFile(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: MulterFile,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = req.user.sub;
    const result: UploadedFileType = await this.fileUploadService.uploadFile(
      userId,
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      folder || 'uploads',
    );

    return {
      message: 'File uploaded successfully',
      ...result,
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteFile(@Body('file_url') fileUrl: string) {
    if (!fileUrl) {
      throw new BadRequestException('File URL is required');
    }

    await this.fileUploadService.deleteFile(fileUrl);

    return {
      message: 'File deleted successfully',
    };
  }

  @Post('signed-url')
  @HttpCode(HttpStatus.OK)
  async getSignedUrl(
    @Body('file_url') fileUrl: string,
    @Body('expires_in') expiresIn?: number,
  ) {
    if (!fileUrl) {
      throw new BadRequestException('File URL is required');
    }

    const signedUrl = await this.fileUploadService.getSignedUrl(
      fileUrl,
      expiresIn || 3600,
    );

    return {
      signed_url: signedUrl,
    };
  }
}
