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
var ProgressService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.ProgressService = void 0;
const common_1 = require('@nestjs/common');
const supabase_client_1 = require('../config/supabase.client');
let ProgressService = (ProgressService_1 = class ProgressService {
  logger = new common_1.Logger(ProgressService_1.name);
  async getProgress(userId, startDate, endDate) {
    let query = supabase_client_1.supabaseAdmin
      .from('study_progress')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    const result = await query;
    const data = result.data;
    const error = result.error;
    if (error) {
      this.logger.error(`Failed to fetch progress: ${error.message}`);
      throw new common_1.BadRequestException('Failed to fetch progress');
    }
    const progress = (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      date: row.date,
      studySessionsCount: row.study_sessions_count,
      totalStudyTimeMinutes: row.total_study_time_minutes,
      notesCreated: row.notes_created,
      filesUploaded: row.files_uploaded,
      cardsReviewed: row.cards_reviewed,
      cardsLearned: row.cards_learned,
      streakDays: row.streak_days,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    return { progress, total: progress.length };
  }
  async getStats(userId) {
    const [sessionsData, notesData, filesData, cardsData, progressData] =
      await Promise.all([
        this.getTotalSessions(userId),
        this.getTotalNotes(userId),
        this.getTotalFiles(userId),
        this.getTotalCards(userId),
        this.getProgressData(userId),
      ]);
    const totalSessions = sessionsData?.total ?? 0;
    const totalNotes = notesData?.total ?? 0;
    const totalFiles = filesData?.total ?? 0;
    const totalCards = cardsData?.total ?? 0;
    const totalStudyTimeMinutes =
      progressData?.reduce((sum, p) => sum + p.total_study_time_minutes, 0) ??
      0;
    const {
      currentStreak,
      longestStreak,
      cardsDueToday,
      cardsReviewedThisWeek,
    } = await this.calculateStreaksAndReviewStats(userId);
    const averageSessionLength =
      totalSessions > 0 ? Math.round(totalStudyTimeMinutes / totalSessions) : 0;
    const weeklyProgress = await this.getWeeklyProgress(userId);
    const mostProductiveDay = this.findMostProductiveDay(progressData);
    return {
      totalSessions,
      totalStudyTimeMinutes,
      totalNotes,
      totalFiles,
      totalCards,
      currentStreak,
      longestStreak,
      averageSessionLength,
      cardsDueToday,
      cardsReviewedThisWeek,
      mostProductiveDay,
      weeklyProgress,
    };
  }
  async getTotalSessions(userId) {
    const { data } = await supabase_client_1.supabaseAdmin
      .from('study_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    return { total: data?.length ?? 0 };
  }
  async getTotalNotes(userId) {
    const { data } = await supabase_client_1.supabaseAdmin
      .from('session_notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    return { total: data?.length ?? 0 };
  }
  async getTotalFiles(userId) {
    const { data } = await supabase_client_1.supabaseAdmin
      .from('session_files')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    return { total: data?.length ?? 0 };
  }
  async getTotalCards(userId) {
    const { data } = await supabase_client_1.supabaseAdmin
      .from('spaced_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    return { total: data?.length ?? 0 };
  }
  async getProgressData(userId) {
    const { data } = await supabase_client_1.supabaseAdmin
      .from('study_progress')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);
    return data ?? [];
  }
  async calculateStreaksAndReviewStats(userId) {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const { data: progressData } = await supabase_client_1.supabaseAdmin
      .from('study_progress')
      .select('date, streak_days')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(100);
    let currentStreak = 0;
    let longestStreak = 0;
    if (progressData && progressData.length > 0) {
      currentStreak = progressData[0]?.streak_days ?? 0;
      longestStreak = Math.max(...progressData.map((p) => p.streak_days), 0);
    }
    const { data: dueCards } = await supabase_client_1.supabaseAdmin
      .from('spaced_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('next_review_date', today);
    const cardsDueToday = dueCards?.length ?? 0;
    const { data: reviewedThisWeek } = await supabase_client_1.supabaseAdmin
      .from('spaced_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('last_reviewed_at', weekAgo);
    const cardsReviewedThisWeek = reviewedThisWeek?.length ?? 0;
    return {
      currentStreak,
      longestStreak,
      cardsDueToday,
      cardsReviewedThisWeek,
    };
  }
  async getWeeklyProgress(userId) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const { data } = await supabase_client_1.supabaseAdmin
      .from('study_progress')
      .select('date, study_sessions_count, total_study_time_minutes')
      .eq('user_id', userId)
      .gte('date', weekAgo)
      .order('date', { ascending: true });
    return (data ?? []).map((row) => ({
      date: row.date,
      sessionsCount: row.study_sessions_count,
      studyTimeMinutes: row.total_study_time_minutes,
    }));
  }
  findMostProductiveDay(progressData) {
    if (!progressData || progressData.length === 0) {
      return 'N/A';
    }
    const dayTotals = {};
    for (const p of progressData) {
      const day = p.date;
      dayTotals[day] = (dayTotals[day] ?? 0) + p.total_study_time_minutes;
    }
    const maxDay = Object.entries(dayTotals).reduce((max, [day, time]) =>
      time > max[1] ? [day, time] : max,
    );
    return maxDay[0] !== '0' ? maxDay[0] : 'N/A';
  }
  async recordActivity(userId, activity, durationMinutes = 0) {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase_client_1.supabaseAdmin
      .from('study_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    const updateData = {
      updated_at: new Date().toISOString(),
    };
    switch (activity) {
      case 'session':
        updateData.study_sessions_count =
          (existing?.study_sessions_count ?? 0) + 1;
        updateData.total_study_time_minutes =
          (existing?.total_study_time_minutes ?? 0) + durationMinutes;
        break;
      case 'note':
        updateData.notes_created = (existing?.notes_created ?? 0) + 1;
        break;
      case 'file':
        updateData.files_uploaded = (existing?.files_uploaded ?? 0) + 1;
        break;
      case 'card_review':
        updateData.cards_reviewed = (existing?.cards_reviewed ?? 0) + 1;
        break;
      case 'card_learn':
        updateData.cards_learned = (existing?.cards_learned ?? 0) + 1;
        break;
    }
    if (existing) {
      await supabase_client_1.supabaseAdmin
        .from('study_progress')
        .update(updateData)
        .eq('user_id', userId)
        .eq('date', today);
    } else {
      await supabase_client_1.supabaseAdmin.from('study_progress').insert({
        user_id: userId,
        date: today,
        study_sessions_count: activity === 'session' ? 1 : 0,
        total_study_time_minutes: activity === 'session' ? durationMinutes : 0,
        notes_created: activity === 'note' ? 1 : 0,
        files_uploaded: activity === 'file' ? 1 : 0,
        cards_reviewed: activity === 'card_review' ? 1 : 0,
        cards_learned: activity === 'card_learn' ? 1 : 0,
        streak_days: 1,
      });
    }
    await this.updateStreak(userId);
  }
  async updateStreak(userId) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const { data: yesterdayProgress } = await supabase_client_1.supabaseAdmin
      .from('study_progress')
      .select('streak_days')
      .eq('user_id', userId)
      .eq('date', yesterday)
      .single();
    const today = new Date().toISOString().split('T')[0];
    const newStreak = (yesterdayProgress?.streak_days ?? 0) + 1;
    await supabase_client_1.supabaseAdmin
      .from('study_progress')
      .update({ streak_days: newStreak })
      .eq('user_id', userId)
      .eq('date', today);
  }
});
ProgressService = ProgressService_1 = __decorate(
  [(0, common_1.Injectable)()],
  ProgressService,
);
exports.ProgressService = ProgressService;
//# sourceMappingURL=progress.service.js.map
