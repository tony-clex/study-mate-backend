import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  ],
  controllers: [FileUploadController],
  providers: [FileUploadService, JwtService, JwtAuthGuard],
  exports: [FileUploadService],
})
export class FileUploadModule {}
