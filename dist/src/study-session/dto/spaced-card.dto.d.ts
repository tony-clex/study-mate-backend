export declare class CreateSpacedCardDto {
  sessionId?: string;
  noteId?: string;
  frontText: string;
  backText: string;
}
export declare class UpdateSpacedCardDto {
  frontText?: string;
  backText?: string;
}
export declare class ReviewCardDto {
  quality: number;
}
export declare class SpacedCardResponse {
  id: string;
  userId: string;
  sessionId: string | null;
  noteId: string | null;
  frontText: string;
  backText: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export declare class SpacedCardListResponse {
  cards: SpacedCardResponse[];
  total: number;
  dueToday: number;
}
