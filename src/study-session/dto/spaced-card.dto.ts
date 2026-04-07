import {
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateSpacedCardDto {
  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsUUID()
  @IsOptional()
  noteId?: string;

  @IsString()
  frontText: string;

  @IsString()
  backText: string;
}

export class UpdateSpacedCardDto {
  @IsString()
  @IsOptional()
  frontText?: string;

  @IsString()
  @IsOptional()
  backText?: string;
}

export class ReviewCardDto {
  @IsNumber()
  @Min(0)
  @Max(5)
  quality: number;
}

export class SpacedCardResponse {
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

export class SpacedCardListResponse {
  cards: SpacedCardResponse[];
  total: number;
  dueToday: number;
}
