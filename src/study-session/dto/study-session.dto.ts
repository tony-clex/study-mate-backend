import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsUrl,
  IsNumber,
  IsDateString,
  IsEnum,
  IsObject,
  Min,
} from 'class-validator';

export enum StudySessionStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export enum StudySessionNotificationType {
  UNFINISHED_SESSION = 'unfinished_session',
  SCHEDULED_SESSION = 'scheduled_session',
  RESUME_SESSION = 'resume_session',
}

export class CreateStudySessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsDateString()
  @IsOptional()
  scheduledStartAt?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  plannedDurationMinutes?: number;
}

export class UpdateStudySessionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsDateString()
  @IsOptional()
  scheduledStartAt?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  plannedDurationMinutes?: number;
}

export class UpdateStudySessionCheckpointDto {
  @IsObject()
  @IsOptional()
  checkpoint?: Record<string, unknown>;
}

export class UpdateStudySessionStateDto {
  @IsEnum(StudySessionStatus)
  status: StudySessionStatus;

  @IsObject()
  @IsOptional()
  checkpoint?: Record<string, unknown>;
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
  scheduled_start_at: string | null;
  planned_duration_minutes: number | null;
  status: StudySessionStatus;
  started_at: string | null;
  completed_at: string | null;
  last_checkpoint: Record<string, unknown> | null;
  last_checkpoint_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudySessionListResponse {
  sessions: StudySessionResponse[];
  total: number;
}

export interface StudySessionNotificationResponse {
  id: string;
  session_id: string;
  title: string;
  message: string;
  type: StudySessionNotificationType;
  status: StudySessionStatus;
  due_at: string | null;
  action: 'resume' | 'open';
  action_payload: {
    sessionId: string;
  };
  created_at: string;
}

export class CreateSessionNoteDto {
  @IsUUID()
  @IsOptional()
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

// Session File DTOs
export class CreateSessionFileDto {
  @IsUUID()
  @IsOptional()
  @IsNotEmpty({ message: 'Session ID is required' })
  session_id: string;

  @IsUrl()
  @IsNotEmpty({ message: 'File URL is required' })
  file_url: string;

  @IsString()
  @IsNotEmpty({ message: 'File name is required' })
  file_name: string;

  @IsString()
  @IsNotEmpty({ message: 'File type is required' })
  file_type: string;

  @IsNumber()
  @IsNotEmpty({ message: 'File size is required' })
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
