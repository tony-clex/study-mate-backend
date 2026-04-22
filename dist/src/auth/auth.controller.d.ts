import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}
export declare class AuthController {
  private readonly authService;
  constructor(authService: AuthService);
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
  updateAccount(
    req: AuthenticatedRequest,
    body: {
      email?: string;
      password?: string;
    },
  ): Promise<{
    message: string;
    user: import('@supabase/auth-js').User;
  }>;
}
export {};
