// import { Module } from '@nestjs/common';
// import { StudySessionController } from './study-session.controller';
// import { StudySessionService } from './study-session.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { AuthModule } from '../auth/auth.module';

// @Module({
//   imports: [AuthModule],
//   controllers: [StudySessionController],
//   providers: [StudySessionService, JwtAuthGuard],
//   exports: [StudySessionService],
// })
// export class StudySessionModule {}

import { Module } from '@nestjs/common';
import { StudySessionController } from './study-session.controller';
import { StudySessionService } from './study-session.service';
import { SpacedCardService } from './spaced-card.service';
import { ProgressService } from './progress.service';
import { CollaborationService } from './collaboration.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [AuthModule],
  controllers: [StudySessionController],
  providers: [
    StudySessionService,
    SpacedCardService,
    ProgressService,
    CollaborationService,
    JwtAuthGuard,
  ],
  exports: [
    StudySessionService,
    SpacedCardService,
    ProgressService,
    CollaborationService,
  ],
})
export class StudySessionModule {}
