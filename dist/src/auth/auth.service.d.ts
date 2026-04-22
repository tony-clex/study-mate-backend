import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
  private jwtService;
  constructor(jwtService: JwtService);
  private withRetry;
  signInWithGoogle(): Promise<{
    url: string;
  }>;
  registerWithGoogle(): Promise<{
    url: string;
  }>;
  handleOAuthCallback(code: string): Promise<{
    message: string;
    access_token: string;
    user: {
      id: string;
      email: string | undefined;
    };
  }>;
  register(registerDto: RegisterDto): Promise<{
    message: string;
    access_token: string;
    user: {
      id: string;
      email: string | undefined;
      name: string;
    };
  }>;
  login(loginDto: LoginDto): Promise<{
    message: string;
    access_token: string;
    user: {
      id: string;
      email: string | undefined;
    };
  }>;
  updateAccount(
    userId: string,
    newEmail?: string,
    newPassword?: string,
  ): Promise<{
    message: string;
    user: import('@supabase/supabase-js').AuthUser;
  }>;
}
