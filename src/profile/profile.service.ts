import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

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

export class UpdateProfileDto {
  full_name?: string;
  bio?: string;
  learning_goal?: string;
  study_level?: string;
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  );

  async getProfile(userId: string): Promise<Profile> {
    const response = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const data = response.data as Profile | null;
    const error = response.error as Error | null;

    if (error) throw new BadRequestException('Profile not found');
    return data as Profile;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ): Promise<Profile> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    let avatarUrl: string | undefined;

    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG and PNG are allowed.',
        );
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new BadRequestException('File size must be less than 2MB');
      }

      this.logger.log(
        `Uploading file for user ${userId}: ${file.originalname}`,
      );

      const fileExt = file.originalname?.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        this.logger.error(`Supabase Upload Error: ${uploadError.message}`);
        throw new BadRequestException(
          `Image upload failed: ${uploadError.message}`,
        );
      }

      const { data: urlData } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      avatarUrl = urlData.publicUrl;
    }

    // Update the Database
    const updatePayload: Record<string, unknown> = {
      id: userId,
      ...dto,
      updated_at: new Date(),
    };

    if (avatarUrl) {
      updatePayload.avatar_url = avatarUrl;
    }

    this.logger.log(`Updating profile with: ${JSON.stringify(updatePayload)}`);

    const dbResponse = await this.supabase
      .from('profiles')
      .upsert(updatePayload)
      .select()
      .single();

    const updatedProfile = dbResponse.data as Profile | null;
    const dbError = dbResponse.error as Error | null;

    if (dbError) {
      this.logger.error(`Database Error: ${dbError.message}`);
      throw new BadRequestException(
        `Profile update failed: ${dbError.message}`,
      );
    }

    return updatedProfile as Profile;
  }
}
