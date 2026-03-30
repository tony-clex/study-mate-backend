import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ProfileService, UpdateProfileDto, Profile } from './profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

// FIXED: Defined a shape for the incoming body to avoid 'any' access
interface ProfileUpdateBody {
  full_name?: string;
  bio?: string;
  learning_goal?: string;
  study_level?: string;
}

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
  // FIXED: Explicitly typing body
  body: ProfileUpdateBody;
}

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  async getMyProfile(@Req() req: AuthenticatedRequest): Promise<Profile> {
    return this.profileService.getProfile(req.user.id);
  }

  @Post('update')
  @UseInterceptors(AnyFilesInterceptor())
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<Profile> {
    // FIXED: Handled potential undefined files safely
    const avatarFile = (files || []).find((f) => f.fieldname === 'avatar');
    const body = req.body;

    // FIXED: Now accessing body properties is safe because of ProfileUpdateBody
    const dto: UpdateProfileDto = {
      full_name: body.full_name,
      bio: body.bio,
      learning_goal: body.learning_goal,
      study_level: body.study_level,
    };

    return this.profileService.updateProfile(req.user.id, dto, avatarFile);
  }
}
