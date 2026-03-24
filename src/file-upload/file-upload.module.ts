import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  ],
  controllers: [FileUploadController],
  providers: [FileUploadService, JwtAuthGuard],
  exports: [FileUploadService],
})
export class FileUploadModule {}
