import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { supabaseAdmin } from '../config/supabase.client'; // This is your defined client
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation',
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const errorMessage = error.message.toLowerCase();

        const isRetryable =
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('network') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('econnrefused') ||
          errorMessage.includes('enotfound') ||
          errorMessage.includes('socket') ||
          errorMessage.includes('abort');

        lastError = error;

        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(
            `Retry ${attempt}/${MAX_RETRIES} for ${operationName} after ${delay}ms...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error('Operation failed after retries');
  }

  // FIXED: Changed 'supabase' to 'supabaseAdmin'
  async signInWithGoogle() {
    const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: process.env.SUPABASE_REDIRECT_URL,
      },
    });

    if (error) {
      throw new BadRequestException({
        message: 'Google sign-in failed',
        error: error.message,
      });
    }

    return {
      url: data.url,
    };
  }

  // FIXED: Changed 'supabase' to 'supabaseAdmin'
  async registerWithGoogle() {
    const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: process.env.SUPABASE_REDIRECT_URL,
      },
    });

    if (error) {
      throw new BadRequestException({
        message: 'Google registration failed',
        error: error.message,
      });
    }

    return {
      url: data.url,
    };
  }

  // FIXED: Changed 'supabase' to 'supabaseAdmin'
  async handleOAuthCallback(code: string) {
    const { data, error } =
      await supabaseAdmin.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      throw new BadRequestException({
        message: 'OAuth callback failed',
        error: error?.message || 'No user data',
      });
    }

    const payload = { sub: data.user.id, email: data.user.email };
    const token = this.jwtService.sign(payload);

    const userMeta = data.user.user_metadata as
      | Record<string, string>
      | undefined;
    const userName = userMeta?.name || userMeta?.full_name;

    return {
      message: 'OAuth sign-in successful',
      access_token: token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: userName ?? 'No name',
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    try {
      await this.withRetry(async () => {
        const result = await supabaseAdmin.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });

        if (result.error) {
          throw result.error;
        }
        return result;
      }, 'signUp');

      const loginResult = await this.withRetry(async () => {
        const result = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        });

        if (result.error) {
          throw result.error;
        }
        return result;
      }, 'signIn');

      if (!loginResult.data?.user) {
        throw new BadRequestException('Failed to log in after registration');
      }

      const payload = {
        sub: loginResult.data.user.id,
        email: loginResult.data.user.email,
      };
      const token = this.jwtService.sign(payload);

      const userMeta = loginResult.data.user.user_metadata as
        | Record<string, string>
        | undefined;
      const userName = userMeta?.name;

      return {
        message: 'User registered successfully',
        access_token: loginResult.data.session?.access_token || token,
        refresh_token: loginResult.data.session?.refresh_token,
        expires_in: loginResult.data.session?.expires_in,
        user: {
          id: loginResult.data.user.id,
          email: loginResult.data.user.email,
          name: userName ?? name,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const lowerMessage = errorMessage.toLowerCase();

      if (
        lowerMessage.includes('fetch failed') ||
        lowerMessage.includes('network') ||
        lowerMessage.includes('connection') ||
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('econnrefused') ||
        lowerMessage.includes('enotfound')
      ) {
        throw new BadRequestException({
          message: 'Unable to connect to the server',
          error: 'Please check your internet connection and try again.',
        });
      }

      if (lowerMessage.includes('already registered')) {
        throw new BadRequestException('Email already registered');
      }
      if (lowerMessage.includes('rate limit')) {
        throw new BadRequestException(
          'Too many registration attempts. Please wait a few minutes and try again.',
        );
      }

      throw new BadRequestException({
        message: 'Sorry registration failed',
        error: errorMessage,
      });
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    console.log('[Auth] Login attempt for email:', email);

    try {
      // FIXED: using supabaseAdmin and ensuring result is correctly captured
      const result = await this.withRetry(async () => {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('[Auth] Supabase signIn error:', {
            name: error.name,
            message: error.message,
            status: error.status,
          });
          throw error;
        }
        return data; // returns { user, session }
      }, 'signIn');

      if (!result?.user) {
        console.error('[Auth] Login failed: no user returned');
        throw new UnauthorizedException('Invalid email or password');
      }

      if (
        !result.user.email_confirmed_at &&
        !result.user.confirmation_sent_at
      ) {
        console.warn('[Auth] Login attempt for unconfirmed email:', email);
        throw new UnauthorizedException(
          'Please confirm your email address before logging in',
        );
      }

      console.log('[Auth] Login successful for user:', result.user.id);

      const payload = { sub: result.user.id, email: result.user.email };
      const token = this.jwtService.sign(payload);

      // FIXED: Changed 'data.user' to 'result.user' because 'data' was only defined inside the withRetry callback
      const userMeta = result.user.user_metadata as
        | Record<string, string>
        | undefined;
      const userName = userMeta?.name;

      return {
        message: 'Login successful',
        access_token: result.session?.access_token || token,
        refresh_token: result.session?.refresh_token,
        expires_in: result.session?.expires_in,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: userName ?? 'No name',
        },
      };
    } catch (err) {
      // Catch block remains the same
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const lowerMessage = errorMessage.toLowerCase();

      console.error('[Auth] Login error:', err);

      if (
        lowerMessage.includes('fetch failed') ||
        lowerMessage.includes('network') ||
        lowerMessage.includes('connection') ||
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('econnrefused') ||
        lowerMessage.includes('enotfound')
      ) {
        throw new BadRequestException({
          message: 'Unable to connect to the server',
          error: 'Please check your internet connection and try again.',
        });
      }

      if (
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('credentials') ||
        lowerMessage.includes('invalid login') ||
        lowerMessage.includes('wrong password')
      ) {
        console.warn('[Auth] Invalid credentials for email:', email);
        throw new UnauthorizedException('Invalid email or password');
      }

      if (lowerMessage.includes('email') && lowerMessage.includes('confirm')) {
        throw new UnauthorizedException(
          'Please confirm your email address before logging in',
        );
      }

      if (err instanceof UnauthorizedException) {
        throw err;
      }

      throw new UnauthorizedException({
        message: 'Login failed',
        error: 'Invalid email or password',
      });
    }
  }

  // Add this to the bottom of your AuthService class
  async updateAccount(userId: string, newEmail?: string, newPassword?: string) {
    if (!userId) throw new BadRequestException('UserId is required');

    const attributes: Record<string, string> = {};
    if (newEmail) {
      attributes.email = newEmail;
    }
    if (newPassword) {
      attributes.password = newPassword;
    }

    // We use the admin client because updating user attributes
    // often requires higher permissions in Supabase
    const response = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      attributes,
    );

    const error = response.error as Error | null;
    const data = response.data;

    if (error) {
      console.error('[Auth] Account update error:', error.message);
      throw new BadRequestException(`Account update failed: ${error.message}`);
    }

    return {
      message: newEmail
        ? 'Confirmation email sent to both old and new addresses. Please confirm to finish.'
        : 'Password updated successfully',
      user: data?.user,
    };
  }
}
