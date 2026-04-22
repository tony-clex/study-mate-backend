/// <reference types="multer" />
export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  learning_goal?: string;
  study_level?: string;
  created_at?: string;
  updated_at?: string;
}
export declare class UpdateProfileDto {
  full_name?: string;
  bio?: string;
  learning_goal?: string;
  study_level?: string;
}
export declare class ProfileService {
  private readonly logger;
  private supabase;
  getProfile(userId: string): Promise<Profile>;
  updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ): Promise<Profile>;
}
