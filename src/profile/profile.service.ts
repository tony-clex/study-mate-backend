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
    // FIXED: Added <Profile> generic to select
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .returns<Profile[]>() // Explicitly tell TS we expect an array of Profiles
      .maybeSingle();

    if (error) {
      this.logger.error(`Get Profile Error: ${error.message}`);
      throw new BadRequestException('Database error fetching profile');
    }

    if (!data) {
      return {
        id: userId,
        full_name: 'Full Name',
        bio: 'No bio added yet.',
        avatar_url: '',
        learning_goal: '',
        study_level: '',
      };
    }

    return data;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ): Promise<Profile> {
    if (!userId) throw new BadRequestException('User ID is required');

    let avatarUrl: string | undefined;

    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type. Use JPEG or PNG.');
      }

      const fileExt = file.mimetype.split('/')[1] || 'jpg';
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      this.logger.log(`Uploading avatar: ${fileName}`);

      const { error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        this.logger.error(`Storage Error: ${uploadError.message}`);
      } else {
        // FIXED: Destructure properly to avoid 'any' access
        const { data: publicUrlData } = this.supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrlData?.publicUrl;
      }
    }

    // FIXED: Build the database payload using the Profile interface instead of 'any'
    const updatePayload: Partial<Profile> & { id: string } = {
      id: userId,
      updated_at: new Date().toISOString(),
      ...dto,
    };

    if (avatarUrl) {
      updatePayload.avatar_url = avatarUrl;
    }

    // FIXED: Added returns<Profile>() to ensure data isn't 'any'
    const { data: updatedProfile, error: dbError } = await this.supabase
      .from('profiles')
      .upsert(updatePayload, { onConflict: 'id' })
      .select()
      .returns<Profile>()
      .single();

    if (dbError) {
      this.logger.error(
        `Database Error: ${dbError.message} - Code: ${dbError.code}`,
      );

      if (dbError.code === '23503') {
        throw new BadRequestException(
          'Profile link failed: Authentication user not found. Please log out and back in.',
        );
      }
      throw new BadRequestException(`Update failed: ${dbError.message}`);
    }

    if (!updatedProfile) {
      throw new BadRequestException('Profile update failed to return data');
    }

    return updatedProfile;
  }
}
