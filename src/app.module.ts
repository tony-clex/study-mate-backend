import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { StudySessionModule } from './study-session/study-session.module';
import { FileUploadModule } from './file-upload/file-upload.module';

@Module({
  imports: [AuthModule, StudySessionModule, FileUploadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
