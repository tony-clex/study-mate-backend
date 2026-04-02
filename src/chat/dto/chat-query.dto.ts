import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
} from 'class-validator';

export class ChatQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'question is required' })
  question: string;

  @IsOptional()
  @IsUUID('4', { message: 'documentId must be a valid UUID' })
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'document_id must be a valid UUID' })
  @IsString()
  document_id?: string;

  @IsOptional()
  @IsUUID('4', { message: 'sessionId must be a valid UUID' })
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'session_id must be a valid UUID' })
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  file_name?: string;

  @IsOptional()
  @IsUrl({}, { message: 'fileUrl must be a valid URL' })
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'file_url must be a valid URL' })
  @IsString()
  file_url?: string;
}
