import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { ProcessingService } from './processing.service';

@Module({
  imports: [AuthModule, AiModule],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class DocumentsModule {}
