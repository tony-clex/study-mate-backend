import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class SearchCompanionMessageDto {
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
  @IsArray()
  history?: any[];
}
