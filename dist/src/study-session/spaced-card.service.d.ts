import {
  CreateSpacedCardDto,
  ReviewCardDto,
  SpacedCardResponse,
  SpacedCardListResponse,
} from './dto/spaced-card.dto';
export declare class SpacedCardService {
  private readonly logger;
  create(
    userId: string,
    createDto: CreateSpacedCardDto,
  ): Promise<SpacedCardResponse>;
  findAll(userId: string, sessionId?: string): Promise<SpacedCardListResponse>;
  findDueCards(userId: string): Promise<SpacedCardListResponse>;
  findOne(userId: string, cardId: string): Promise<SpacedCardResponse>;
  update(
    userId: string,
    cardId: string,
    updateDto: Partial<CreateSpacedCardDto>,
  ): Promise<SpacedCardResponse>;
  review(
    userId: string,
    cardId: string,
    reviewDto: ReviewCardDto,
  ): Promise<SpacedCardResponse>;
  private calculateNextReview;
  remove(
    userId: string,
    cardId: string,
  ): Promise<{
    message: string;
  }>;
  private mapToResponse;
}
