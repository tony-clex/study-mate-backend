import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsUrl,
} from 'class-validator';

export class CreateStudySessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsOptional()
  subject?: string;
}

export class UpdateStudySessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;
}

export class StudySessionParamsDto {
  @IsUUID()
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

// ============================================
// Session Notes DTOs
// ============================================

export class CreateSessionNoteDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Session ID is required' })
  session_id: string;

  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsUrl()
  @IsOptional()
  file_url?: string;

  @IsString()
  @IsOptional()
  file_name?: string;

  @IsString()
  @IsOptional()
  file_type?: string;
}

export class UpdateSessionNoteDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsUrl()
  @IsOptional()
  file_url?: string;

  @IsString()
  @IsOptional()
  file_name?: string;

  @IsString()
  @IsOptional()
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
