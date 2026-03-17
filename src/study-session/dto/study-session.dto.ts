import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateStudySessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;
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
  created_at: string;
}

export interface StudySessionListResponse {
  sessions: StudySessionResponse[];
  total: number;
}
