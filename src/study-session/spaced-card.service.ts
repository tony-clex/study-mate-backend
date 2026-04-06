import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { supabaseAdmin } from '../config/supabase.client';
import { CreateSpacedCardDto, ReviewCardDto, SpacedCardResponse, SpacedCardListResponse } from './dto/spaced-card.dto';

interface SpacedCardDbRow {
  id: string;
  user_id: string;
  session_id: string | null;
  note_id: string | null;
  front_text: string;
  back_text: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class SpacedCardService {
  private readonly logger = new Logger(SpacedCardService.name);

  async create(userId: string, createDto: CreateSpacedCardDto): Promise<SpacedCardResponse> {
    const { sessionId, noteId, frontText, backText } = createDto;

    const { data, error } = (await supabaseAdmin
      .from('spaced_cards')
      .insert({
        user_id: userId,
        session_id: sessionId || null,
        note_id: noteId || null,
        front_text: frontText.trim(),
        back_text: backText.trim(),
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_date: new Date().toISOString(),
      })
      .select()
      .single()) as { data: SpacedCardDbRow | null; error: any };

    if (error) {
      this.logger.error(`Failed to create card: ${error.message}`);
      throw new BadRequestException('Failed to create spaced card');
    }

    if (!data) {
      throw new BadRequestException('Failed to create spaced card');
    }

    return this.mapToResponse(data);
  }

  async findAll(userId: string, sessionId?: string): Promise<SpacedCardListResponse> {
    let query = supabaseAdmin
      .from('spaced_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch cards: ${error.message}`);
      throw new BadRequestException('Failed to fetch spaced cards');
    }

    const cards = (data ?? []).map((card) => this.mapToResponse(card));

    const today = new Date().toISOString().split('T')[0];
    const dueToday = cards.filter(
      (c) => c.nextReviewDate.split('T')[0] <= today,
    ).length;

    return {
      cards,
      total: cards.length,
      dueToday,
    };
  }

  async findDueCards(userId: string): Promise<SpacedCardListResponse> {
    const today = new Date().toISOString();

    const { data, error } = (await supabaseAdmin
      .from('spaced_cards')
      .select('*')
      .eq('user_id', userId)
      .lte('next_review_date', today)
      .order('next_review_date', { ascending: true })) as {
      data: SpacedCardDbRow[] | null;
      error: any;
    };

    if (error) {
      this.logger.error(`Failed to fetch due cards: ${error.message}`);
      throw new BadRequestException('Failed to fetch due cards');
    }

    const cards = (data ?? []).map((card) => this.mapToResponse(card));

    return {
      cards,
      total: cards.length,
      dueToday: cards.length,
    };
  }

  async findOne(userId: string, cardId: string): Promise<SpacedCardResponse> {
    const { data, error } = (await supabaseAdmin
      .from('spaced_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single()) as { data: SpacedCardDbRow | null; error: any };

    if (error || !data) {
      throw new NotFoundException('Spaced card not found');
    }

    return this.mapToResponse(data);
  }

  async update(
    userId: string,
    cardId: string,
    updateDto: Partial<CreateSpacedCardDto>,
  ): Promise<SpacedCardResponse> {
    await this.findOne(userId, cardId);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updateDto.frontText !== undefined) {
      updateData.front_text = updateDto.frontText.trim();
    }
    if (updateDto.backText !== undefined) {
      updateData.back_text = updateDto.backText.trim();
    }
    if (updateDto.sessionId !== undefined) {
      updateData.session_id = updateDto.sessionId || null;
    }
    if (updateDto.noteId !== undefined) {
      updateData.note_id = updateDto.noteId || null;
    }

    const { data, error } = (await supabaseAdmin
      .from('spaced_cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single()) as { data: SpacedCardDbRow | null; error: any };

    if (error || !data) {
      throw new BadRequestException('Failed to update spaced card');
    }

    return this.mapToResponse(data);
  }

  async review(userId: string, cardId: string, reviewDto: ReviewCardDto): Promise<SpacedCardResponse> {
    const card = await this.findOne(userId, cardId);
    const { quality } = reviewDto;

    const { easeFactor, intervalDays, repetitions } = this.calculateNextReview(
      card.easeFactor,
      card.intervalDays,
      card.repetitions,
      quality,
    );

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

    const { data, error } = (await supabaseAdmin
      .from('spaced_cards')
      .update({
        ease_factor: easeFactor,
        interval_days: intervalDays,
        repetitions: repetitions + 1,
        next_review_date: nextReviewDate.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single()) as { data: SpacedCardDbRow | null; error: any };

    if (error || !data) {
      throw new BadRequestException('Failed to review card');
    }

    return this.mapToResponse(data);
  }

  private calculateNextReview(
    currentEaseFactor: number,
    currentInterval: number,
    currentRepetitions: number,
    quality: number,
  ): { easeFactor: number; intervalDays: number; repetitions: number } {
    let newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor);

    let newInterval: number;
    let newRepetitions = currentRepetitions;

    if (quality < 3) {
      newRepetitions = 0;
      newInterval = 1;
    } else if (currentRepetitions === 0) {
      newInterval = 1;
    } else if (currentRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * newEaseFactor);
    }

    newInterval = Math.min(newInterval, 365);

    return {
      easeFactor: newEaseFactor,
      intervalDays: newInterval,
      repetitions: newRepetitions,
    };
  }

  async remove(userId: string, cardId: string): Promise<{ message: string }> {
    await this.findOne(userId, cardId);

    const { error } = await supabaseAdmin
      .from('spaced_cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to delete card: ${error.message}`);
      throw new BadRequestException('Failed to delete spaced card');
    }

    return { message: 'Spaced card deleted successfully' };
  }

  private mapToResponse(data: SpacedCardDbRow): SpacedCardResponse {
    return {
      id: data.id,
      userId: data.user_id,
      sessionId: data.session_id,
      noteId: data.note_id,
      frontText: data.front_text,
      backText: data.back_text,
      easeFactor: data.ease_factor,
      intervalDays: data.interval_days,
      repetitions: data.repetitions,
      nextReviewDate: data.next_review_date,
      lastReviewedAt: data.last_reviewed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}