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
import { ProfileService, UpdateProfileDto } from './profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email?: string;
  };
}

interface ProfileBody {
  full_name?: string;
  bio?: string;
  learning_goal?: string;
  study_level?: string;
}

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  async getMyProfile(
    @Req() req: AuthenticatedRequest,
  ): Promise<ReturnType<ProfileService['getProfile']>> {
    return this.profileService.getProfile(req.user.sub);
  }

  @Post('update')
  @UseInterceptors(AnyFilesInterceptor())
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ReturnType<ProfileService['updateProfile']>> {
    const avatarFile = files?.find((f) => f.fieldname === 'avatar');

    const body = req.body as ProfileBody;
    const dto: UpdateProfileDto = {
      full_name: body?.full_name,
      bio: body?.bio,
      learning_goal: body?.learning_goal,
      study_level: body?.study_level,
    };

    return this.profileService.updateProfile(req.user.sub, dto, avatarFile);
  }
}
