export declare class CreateStudySessionDto {
  title: string;
  subject?: string;
}
export declare class UpdateStudySessionDto {
  title: string;
}
export declare class StudySessionParamsDto {
  id: string;
}
export interface StudySessionResponse {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  created_at: string;
}
export interface StudySessionListResponse {
  sessions: StudySessionResponse[];
  total: number;
}
export declare class CreateSessionNoteDto {
  session_id: string;
  title: string;
  content?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
}
export declare class UpdateSessionNoteDto {
  title?: string;
  content?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
}
export interface SessionNoteResponse {
  id: string;
  session_id: string;
  user_id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}
export interface SessionNoteListResponse {
  notes: SessionNoteResponse[];
  total: number;
}
export declare class CreateSessionFileDto {
  session_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}
export interface SessionFileResponse {
  id: string;
  session_id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}
export interface SessionFileListResponse {
  files: SessionFileResponse[];
  total: number;
}
