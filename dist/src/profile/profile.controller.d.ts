/// <reference types="multer" />
import { ProfileService, Profile } from './profile.service';
import { Request } from 'express';
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
  body: ProfileUpdateBody;
}
export declare class ProfileController {
  private readonly profileService;
  constructor(profileService: ProfileService);
  getMyProfile(req: AuthenticatedRequest): Promise<Profile>;
  updateProfile(
    req: AuthenticatedRequest,
    files: Express.Multer.File[],
  ): Promise<Profile>;
}
export {};
