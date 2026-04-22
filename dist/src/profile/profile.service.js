'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var ProfileService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.ProfileService = exports.UpdateProfileDto = void 0;
const common_1 = require('@nestjs/common');
const supabase_js_1 = require('@supabase/supabase-js');
class UpdateProfileDto {
  full_name;
  bio;
  learning_goal;
  study_level;
}
exports.UpdateProfileDto = UpdateProfileDto;
let ProfileService = (ProfileService_1 = class ProfileService {
  logger = new common_1.Logger(ProfileService_1.name);
  supabase = (0, supabase_js_1.createClient)(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  );
  async getProfile(userId) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .returns()
      .maybeSingle();
    if (error) {
      this.logger.error(`Get Profile Error: ${error.message}`);
      throw new common_1.BadRequestException('Database error fetching profile');
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
  async updateProfile(userId, dto, file) {
    if (!userId) throw new common_1.BadRequestException('User ID is required');
    let avatarUrl;
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new common_1.BadRequestException(
          'Invalid file type. Use JPEG or PNG.',
        );
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
        const { data: publicUrlData } = this.supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        avatarUrl = publicUrlData?.publicUrl;
      }
    }
    const updatePayload = {
      id: userId,
      updated_at: new Date().toISOString(),
      ...dto,
    };
    if (avatarUrl) {
      updatePayload.avatar_url = avatarUrl;
    }
    const { data: updatedProfile, error: dbError } = await this.supabase
      .from('profiles')
      .upsert(updatePayload, { onConflict: 'id' })
      .select()
      .returns()
      .single();
    if (dbError) {
      this.logger.error(
        `Database Error: ${dbError.message} - Code: ${dbError.code}`,
      );
      if (dbError.code === '23503') {
        throw new common_1.BadRequestException(
          'Profile link failed: Authentication user not found. Please log out and back in.',
        );
      }
      throw new common_1.BadRequestException(
        `Update failed: ${dbError.message}`,
      );
    }
    if (!updatedProfile) {
      throw new common_1.BadRequestException(
        'Profile update failed to return data',
      );
    }
    return updatedProfile;
  }
});
ProfileService = ProfileService_1 = __decorate(
  [(0, common_1.Injectable)()],
  ProfileService,
);
exports.ProfileService = ProfileService;
//# sourceMappingURL=profile.service.js.map
