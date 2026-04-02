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
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import {
  FileUploadService,
  UploadedFile as UploadedFileType,
} from './file-upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StudySessionService } from '../study-session/study-session.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly studySessionService: StudySessionService,
  ) {}

  @Post('api/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: MulterFile,
    @Body('folder') folder?: string,
    @Body('session_id') sessionId?: string,
    @Body('sessionId') sessionIdAlt?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = req.user.id;
    const resolvedSessionId = sessionId || sessionIdAlt;
    const result: UploadedFileType = await this.fileUploadService.uploadFile(
      userId,
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      resolvedSessionId ? `sessions/${resolvedSessionId}` : folder || 'uploads',
    );

    if (resolvedSessionId) {
      const linkedFile = await this.studySessionService.createFile(userId, {
        session_id: resolvedSessionId,
        file_url: result.file_url,
        file_name: result.file_name,
        file_type: result.file_type,
        file_size: result.file_size,
      });

      return {
        message: 'File uploaded successfully',
        document_id: result.id,
        ...linkedFile,
      };
    }

    return {
      message: 'File uploaded successfully',
      ...result,
    };
  }

  @Delete('api/upload')
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

  @Post('api/upload/signed-url')
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

  @Post('session/:id')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSessionFile(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: MulterFile,
    @Param('id') sessionId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.fileUploadService.uploadFile(
      req.user.id,
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      `sessions/${sessionId}`,
    );

    const linkedFile = await this.studySessionService.createFile(req.user.id, {
      session_id: sessionId,
      file_url: result.file_url,
      file_name: result.file_name,
      file_type: result.file_type,
      file_size: result.file_size,
    });

    return {
      message: 'Uploaded to session!',
      document_id: result.id,
      ...linkedFile,
    };
  }
}
