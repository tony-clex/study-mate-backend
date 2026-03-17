import { Module } from '@nestjs/common';
import { StudySessionController } from './study-session.controller';
import { StudySessionService } from './study-session.service';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [StudySessionController],
  providers: [StudySessionService, JwtService, JwtAuthGuard],
  exports: [StudySessionService],
})
export class StudySessionModule {}
