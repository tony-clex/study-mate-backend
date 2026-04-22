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
export declare class FlashcardController {
  private readonly flashcardService;
  private readonly logger;
  constructor(flashcardService: FlashcardService);
  generateFlashcards(dto: GenerateFlashcardsDto): Promise<{
    id: string;
    title: string;
    cardCount: number;
    cards: import('./flashcard.service').GeneratedCard[];
    success: boolean;
  }>;
  modifyCard(dto: ModifyCardDto): Promise<{
    success: boolean;
    card: import('./flashcard.service').GeneratedCard;
  }>;
  chatAboutCards(dto: ChatAboutCardsDto): Promise<{
    success: boolean;
    response: string;
  }>;
  regenerateCard(dto: RegenerateCardDto): Promise<{
    success: boolean;
    card: import('./flashcard.service').GeneratedCard;
  }>;
}
export {};
