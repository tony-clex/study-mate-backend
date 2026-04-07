import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { supabaseAdmin } from '../config/supabase.client';
import {
  StudyProgressResponse,
  StudyProgressListResponse,
  StudyStatsResponse,
} from './dto/progress.dto';

interface StudyProgressDbRow {
  id: string;
  user_id: string;
  date: string;
  study_sessions_count: number;
  total_study_time_minutes: number;
  notes_created: number;
  files_uploaded: number;
  cards_reviewed: number;
  cards_learned: number;
  streak_days: number;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  async getProgress(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<StudyProgressListResponse> {
    let query = supabaseAdmin
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
    const data = result.data as StudyProgressDbRow[] | null;
    const error = result.error;

    if (error) {
      this.logger.error(`Failed to fetch progress: ${error.message}`);
      throw new BadRequestException('Failed to fetch progress');
    }

    const progress: StudyProgressResponse[] = (data ?? []).map((row) => ({
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

  async getStats(userId: string): Promise<StudyStatsResponse> {
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

  private async getTotalSessions(userId: string): Promise<{ total: number }> {
    const { data } = (await supabaseAdmin
      .from('study_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)) as { data: unknown[] | null };

    return { total: data?.length ?? 0 };
  }

  private async getTotalNotes(userId: string): Promise<{ total: number }> {
    const { data } = (await supabaseAdmin
      .from('session_notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)) as { data: unknown[] | null };

    return { total: data?.length ?? 0 };
  }

  private async getTotalFiles(userId: string): Promise<{ total: number }> {
    const { data } = (await supabaseAdmin
      .from('session_files')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)) as { data: unknown[] | null };

    return { total: data?.length ?? 0 };
  }

  private async getTotalCards(userId: string): Promise<{ total: number }> {
    const { data } = (await supabaseAdmin
      .from('spaced_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)) as { data: unknown[] | null };

    return { total: data?.length ?? 0 };
  }

  private async getProgressData(userId: string): Promise<StudyProgressDbRow[]> {
    const { data } = (await supabaseAdmin
      .from('study_progress')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30)) as { data: StudyProgressDbRow[] | null };

    return data ?? [];
  }

  private async calculateStreaksAndReviewStats(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: progressData } = (await supabaseAdmin
      .from('study_progress')
      .select('date, streak_days')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(100)) as {
      data: Array<{ date: string; streak_days: number }> | null;
    };

    let currentStreak = 0;
    let longestStreak = 0;

    if (progressData && progressData.length > 0) {
      currentStreak = progressData[0]?.streak_days ?? 0;
      longestStreak = Math.max(...progressData.map((p) => p.streak_days), 0);
    }

    const { data: dueCards } = (await supabaseAdmin
      .from('spaced_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('next_review_date', today)) as { data: unknown[] | null };

    const cardsDueToday = dueCards?.length ?? 0;

    const { data: reviewedThisWeek } = (await supabaseAdmin
      .from('spaced_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('last_reviewed_at', weekAgo)) as { data: unknown[] | null };

    const cardsReviewedThisWeek = reviewedThisWeek?.length ?? 0;

    return {
      currentStreak,
      longestStreak,
      cardsDueToday,
      cardsReviewedThisWeek,
    };
  }

  private async getWeeklyProgress(userId: string) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data } = (await supabaseAdmin
      .from('study_progress')
      .select('date, study_sessions_count, total_study_time_minutes')
      .eq('user_id', userId)
      .gte('date', weekAgo)
      .order('date', { ascending: true })) as {
      data: Array<{
        date: string;
        study_sessions_count: number;
        total_study_time_minutes: number;
      }> | null;
    };

    return (data ?? []).map((row) => ({
      date: row.date,
      sessionsCount: row.study_sessions_count,
      studyTimeMinutes: row.total_study_time_minutes,
    }));
  }

  private findMostProductiveDay(progressData: StudyProgressDbRow[]) {
    if (!progressData || progressData.length === 0) {
      return 'N/A';
    }

    const dayTotals: Record<string, number> = {};
    for (const p of progressData) {
      const day = p.date;
      dayTotals[day] = (dayTotals[day] ?? 0) + p.total_study_time_minutes;
    }

    const maxDay = Object.entries(dayTotals).reduce((max, [day, time]) =>
      time > max[1] ? [day, time] : max,
    );

    return maxDay[0] !== '0' ? maxDay[0] : 'N/A';
  }

  async recordActivity(
    userId: string,
    activity: 'session' | 'note' | 'file' | 'card_review' | 'card_learn',
    durationMinutes = 0,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = (await supabaseAdmin
      .from('study_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()) as { data: StudyProgressDbRow | null };

    const updateData: Record<string, unknown> = {
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
      await supabaseAdmin
        .from('study_progress')
        .update(updateData)
        .eq('user_id', userId)
        .eq('date', today);
    } else {
      await supabaseAdmin.from('study_progress').insert({
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

  private async updateStreak(userId: string): Promise<void> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: yesterdayProgress } = (await supabaseAdmin
      .from('study_progress')
      .select('streak_days')
      .eq('user_id', userId)
      .eq('date', yesterday)
      .single()) as { data: { streak_days: number } | null };

    const today = new Date().toISOString().split('T')[0];
    const newStreak = (yesterdayProgress?.streak_days ?? 0) + 1;

    await supabaseAdmin
      .from('study_progress')
      .update({ streak_days: newStreak })
      .eq('user_id', userId)
      .eq('date', today);
  }
}
