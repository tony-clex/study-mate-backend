// import { Module } from '@nestjs/common';
// import { MulterModule } from '@nestjs/platform-express';
// import { memoryStorage } from 'multer';
// import { FileUploadController } from './file-upload.controller';
// import { FileUploadService } from './file-upload.service';
// import { JwtService } from '@nestjs/jwt';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { StudySessionModule } from '../study-session/study-session.module';

// @Module({
//   imports: [
//     StudySessionModule,
//     MulterModule.register({
//       storage: memoryStorage(),
//       limits: {
//         fileSize: 10 * 1024 * 1024,
//       },
//     }),
//   ],
//   controllers: [FileUploadController],
//   providers: [FileUploadService, JwtService, JwtAuthGuard],
//   exports: [FileUploadService],
// })
// export class FileUploadModule {}


import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StudySessionModule } from '../study-session/study-session.module';
import { DocumentsModule } from '../documents/documents.module';
// 1. IMPORT THE AI MODULE HERE
import { AiModule } from '../ai/ai.module'; 

@Module({
  imports: [
    StudySessionModule,
    DocumentsModule,
    // 2. ADD IT TO THIS ARRAY
    AiModule, 
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