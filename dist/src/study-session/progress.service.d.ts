import {
  StudyProgressListResponse,
  StudyStatsResponse,
} from './dto/progress.dto';
export declare class ProgressService {
  private readonly logger;
  getProgress(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<StudyProgressListResponse>;
  getStats(userId: string): Promise<StudyStatsResponse>;
  private getTotalSessions;
  private getTotalNotes;
  private getTotalFiles;
  private getTotalCards;
  private getProgressData;
  private calculateStreaksAndReviewStats;
  private getWeeklyProgress;
  private findMostProductiveDay;
  recordActivity(
    userId: string,
    activity: 'session' | 'note' | 'file' | 'card_review' | 'card_learn',
    durationMinutes?: number,
  ): Promise<void>;
  private updateStreak;
}
