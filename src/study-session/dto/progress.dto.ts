export class StudyProgressResponse {
  id: string;
  userId: string;
  date: string;
  studySessionsCount: number;
  totalStudyTimeMinutes: number;
  notesCreated: number;
  filesUploaded: number;
  cardsReviewed: number;
  cardsLearned: number;
  streakDays: number;
  createdAt: string;
  updatedAt: string;
}

export class StudyProgressListResponse {
  progress: StudyProgressResponse[];
  total: number;
}

export class StudyStatsResponse {
  totalSessions: number;
  totalStudyTimeMinutes: number;
  totalNotes: number;
  totalFiles: number;
  totalCards: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionLength: number;
  cardsDueToday: number;
  cardsReviewedThisWeek: number;
  mostProductiveDay: string;
  weeklyProgress: {
    date: string;
    sessionsCount: number;
    studyTimeMinutes: number;
  }[];
}