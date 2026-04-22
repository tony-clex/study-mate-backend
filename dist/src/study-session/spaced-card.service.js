'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var SpacedCardService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.SpacedCardService = void 0;
const common_1 = require('@nestjs/common');
const supabase_client_1 = require('../config/supabase.client');
let SpacedCardService = (SpacedCardService_1 = class SpacedCardService {
  logger = new common_1.Logger(SpacedCardService_1.name);
  async create(userId, createDto) {
    const { sessionId, noteId, frontText, backText } = createDto;
    const { data, error } = await supabase_client_1.supabaseAdmin
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
      .single();
    if (error) {
      this.logger.error(`Failed to create card: ${error.message}`);
      throw new common_1.BadRequestException('Failed to create spaced card');
    }
    if (!data) {
      throw new common_1.BadRequestException('Failed to create spaced card');
    }
    return this.mapToResponse(data);
  }
  async findAll(userId, sessionId) {
    let query = supabase_client_1.supabaseAdmin
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
      throw new common_1.BadRequestException('Failed to fetch spaced cards');
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
  async findDueCards(userId) {
    const today = new Date().toISOString();
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('spaced_cards')
      .select('*')
      .eq('user_id', userId)
      .lte('next_review_date', today)
      .order('next_review_date', { ascending: true });
    if (error) {
      this.logger.error(`Failed to fetch due cards: ${error.message}`);
      throw new common_1.BadRequestException('Failed to fetch due cards');
    }
    const cards = (data ?? []).map((card) => this.mapToResponse(card));
    return {
      cards,
      total: cards.length,
      dueToday: cards.length,
    };
  }
  async findOne(userId, cardId) {
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('spaced_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();
    if (error || !data) {
      throw new common_1.NotFoundException('Spaced card not found');
    }
    return this.mapToResponse(data);
  }
  async update(userId, cardId, updateDto) {
    await this.findOne(userId, cardId);
    const updateData = {
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
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('spaced_cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error || !data) {
      throw new common_1.BadRequestException('Failed to update spaced card');
    }
    return this.mapToResponse(data);
  }
  async review(userId, cardId, reviewDto) {
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
    const { data, error } = await supabase_client_1.supabaseAdmin
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
      .single();
    if (error || !data) {
      throw new common_1.BadRequestException('Failed to review card');
    }
    return this.mapToResponse(data);
  }
  calculateNextReview(
    currentEaseFactor,
    currentInterval,
    currentRepetitions,
    quality,
  ) {
    let newEaseFactor =
      currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor);
    let newInterval;
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
  async remove(userId, cardId) {
    await this.findOne(userId, cardId);
    const { error } = await supabase_client_1.supabaseAdmin
      .from('spaced_cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', userId);
    if (error) {
      this.logger.error(`Failed to delete card: ${error.message}`);
      throw new common_1.BadRequestException('Failed to delete spaced card');
    }
    return { message: 'Spaced card deleted successfully' };
  }
  mapToResponse(data) {
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
});
SpacedCardService = SpacedCardService_1 = __decorate(
  [(0, common_1.Injectable)()],
  SpacedCardService,
);
exports.SpacedCardService = SpacedCardService;
//# sourceMappingURL=spaced-card.service.js.map
