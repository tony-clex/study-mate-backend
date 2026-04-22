import { AiService } from '../ai/ai.service';
interface FlashcardInput {
  numCards: number;
  fileName: string;
  sourceText?: string;
  mimeType?: string;
}
export interface GeneratedCard {
  id: string;
  front: string;
  back: string;
}
interface CardModificationInput {
  cardId: string;
  modification: 'simpler' | 'harder' | 'examples';
  currentFront: string;
  currentBack: string;
}
export declare class FlashcardService {
  private readonly aiService;
  private readonly logger;
  private readonly genAI;
  constructor(aiService: AiService);
  generateFlashcards(input: FlashcardInput): Promise<{
    id: string;
    title: string;
    cardCount: number;
    cards: GeneratedCard[];
  }>;
  private generateWithGemini;
  private generateWithOpenRouter;
  private generateWithGroq;
  modifyCard(input: CardModificationInput): Promise<GeneratedCard>;
  chatAboutCards(message: string, deckCards: GeneratedCard[]): Promise<string>;
  private parseFlashcardsJson;
  private parseJsonResponse;
}
export {};
