'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.StudyStatsResponse =
  exports.StudyProgressListResponse =
  exports.StudyProgressResponse =
    void 0;
class StudyProgressResponse {
  id;
  userId;
  date;
  studySessionsCount;
  totalStudyTimeMinutes;
  notesCreated;
  filesUploaded;
  cardsReviewed;
  cardsLearned;
  streakDays;
  createdAt;
  updatedAt;
}
exports.StudyProgressResponse = StudyProgressResponse;
class StudyProgressListResponse {
  progress;
  total;
}
exports.StudyProgressListResponse = StudyProgressListResponse;
class StudyStatsResponse {
  totalSessions;
  totalStudyTimeMinutes;
  totalNotes;
  totalFiles;
  totalCards;
  currentStreak;
  longestStreak;
  averageSessionLength;
  cardsDueToday;
  cardsReviewedThisWeek;
  mostProductiveDay;
  weeklyProgress;
}
exports.StudyStatsResponse = StudyStatsResponse;
//# sourceMappingURL=progress.dto.js.map
