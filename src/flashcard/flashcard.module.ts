import { Module } from '@nestjs/common';
import { FlashcardController } from './flashcard.controller';
import { FlashcardService } from './flashcard.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [FlashcardController],
  providers: [FlashcardService],
  exports: [FlashcardService],
})
export class FlashcardModule {}
