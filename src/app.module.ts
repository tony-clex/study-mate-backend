// import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';

// import { AuthModule } from './auth/auth.module';
// import { StudySessionModule } from './study-session/study-session.module';
// import { FileUploadModule } from './file-upload/file-upload.module';
// import { ProfileModule } from './profile/profile.module';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//       envFilePath: '.env',
//     }),
//     AuthModule,
//     StudySessionModule,
//     FileUploadModule,
//     ProfileModule,
//   ],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StudySessionModule } from './study-session/study-session.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { ProfileModule } from './profile/profile.module';
import { DocumentsModule } from './documents/documents.module';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';
import { FlashcardModule } from './flashcard/flashcard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    ChatModule,
    StudySessionModule,
    FileUploadModule,
    ProfileModule,
    DocumentsModule,
    SearchModule,
    FlashcardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
