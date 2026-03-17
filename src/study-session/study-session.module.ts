import { Module } from '@nestjs/common';
import { StudySessionController } from './study-session.controller';
import { StudySessionService } from './study-session.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [StudySessionController],
  providers: [StudySessionService, JwtAuthGuard],
  exports: [StudySessionService],
})
export class StudySessionModule {}
