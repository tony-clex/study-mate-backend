import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FlashcardService } from './flashcard.service';

interface GenerateFlashcardsDto {
  numCards: number;
  fileName: string;
  sourceText?: string;
  mimeType?: string;
}

interface ModifyCardDto {
  cardId: string;
  modification: 'simpler' | 'harder' | 'examples';
  currentFront: string;
  currentBack: string;
}

interface ChatAboutCardsDto {
  message: string;
  cards: Array<{
    id: string;
    front: string;
    back: string;
  }>;
}

interface RegenerateCardDto {
  cardId: string;
  currentFront: string;
  currentBack: string;
}

@Controller('flashcard')
export class FlashcardController {
  private readonly logger = new Logger(FlashcardController.name);

  constructor(private readonly flashcardService: FlashcardService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateFlashcards(@Body() dto: GenerateFlashcardsDto) {
    this.logger.log(
      `[FlashcardController] Generating ${dto.numCards} flashcards for ${dto.fileName}`,
    );

    const result = await this.flashcardService.generateFlashcards(dto);

    return { success: true, ...result };
  }

  @Post('modify')
  @HttpCode(HttpStatus.OK)
  async modifyCard(@Body() dto: ModifyCardDto) {
    this.logger.log(
      `[FlashcardController] Modifying card ${dto.cardId} with ${dto.modification}`,
    );

    const updatedCard = await this.flashcardService.modifyCard(dto);

    return { success: true, card: updatedCard };
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chatAboutCards(@Body() dto: ChatAboutCardsDto) {
    this.logger.log(`[FlashcardController] Chat about flashcards`);

    const response = await this.flashcardService.chatAboutCards(
      dto.message,
      dto.cards,
    );

    return { success: true, response };
  }

  @Post('regenerate-card')
  @HttpCode(HttpStatus.OK)
  async regenerateCard(@Body() dto: RegenerateCardDto) {
    this.logger.log(`[FlashcardController] Regenerating card ${dto.cardId}`);

    // Regenerate by modifying with 'examples' to provide a fresh version
    const updatedCard = await this.flashcardService.modifyCard({
      cardId: dto.cardId,
      modification: 'examples',
      currentFront: dto.currentFront,
      currentBack: dto.currentBack,
    });

    return { success: true, card: updatedCard };
  }
}
