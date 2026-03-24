import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { sub: string; email: string };
}

interface FileData {
  uri: string;
  name: string;
  type: string;
}

@Controller('api/upload')
@UseGuards(JwtAuthGuard)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @Req() req: AuthenticatedRequest,
    @Body() body: { file?: string; folder?: string },
  ) {
    if (!body.file) {
      throw new BadRequestException('No file data provided');
    }

    let fileData: FileData;
    try {
      const parsed: unknown =
        typeof body.file === 'string' ? JSON.parse(body.file) : body.file;
      if (!parsed || typeof parsed !== 'object') {
        throw new BadRequestException('Invalid file data format');
      }
      fileData = parsed as FileData;
    } catch {
      throw new BadRequestException('Invalid file data format');
    }

    if (!fileData.uri || !fileData.name) {
      throw new BadRequestException('File URI and name are required');
    }

    const userId = req.user.sub;
    const folder = body.folder || 'uploads';

    try {
      // Download the file from the URI and upload to storage
      const result = await this.fileUploadService.uploadFileFromUrl(
        userId,
        {
          originalname: fileData.name,
          mimetype: fileData.type || 'application/octet-stream',
        },
        folder,
        fileData.uri,
      );

      return {
        message: 'File uploaded successfully',
        ...result,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new BadRequestException(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
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
