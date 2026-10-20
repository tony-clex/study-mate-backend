import { Module } from '@nestjs/common';
import { FlashcardController } from './flashcard.controller';
import { FlashcardService } from './flashcard.service';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';

import { ProcessingService } from '../documents/processing.service';

@Module({
  imports: [AiModule, DocumentsModule],
  controllers: [FlashcardController],
  providers: [FlashcardService, ProcessingService],
  exports: [FlashcardService],
})
export class FlashcardModule {}
