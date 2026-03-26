import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  full_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  bio?: string;

  @IsString()
  @IsOptional()
  learning_goal?: string;

  @IsString()
  @IsOptional()
  study_level?: string;
}
