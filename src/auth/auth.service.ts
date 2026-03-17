import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { supabase } from '../config/supabase.client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  /**
   * Execute a function with retry logic for network errors
   */
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

        // Check if this is a retryable error (network/connection related)
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
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(
            `Retry ${attempt}/${MAX_RETRIES} for ${operationName} after ${delay}ms...`,
          );
          // eslint-disable-next-line no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Not retryable or max retries reached
        throw error;
      }
    }

    throw lastError ?? new Error('Operation failed after retries');
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    try {
      // Sign up with retry logic
      await this.withRetry(
        async () => {
          const result = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          });

          if (result.error) {
            throw result.error;
          }
          return result;
        },
        'signUp',
      );

      // Sign in with retry logic
      const loginResult = await this.withRetry(
        async () => {
          const result = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (result.error) {
            throw result.error;
          }
          return result;
        },
        'signIn',
      );

      if (!loginResult.data?.user) {
        throw new BadRequestException('Failed to log in after registration');
      }

      const payload = { sub: loginResult.data.user.id, email: loginResult.data.user.email };
      const token = this.jwtService.sign(payload);

      const userMeta = loginResult.data.user.user_metadata as
        | Record<string, string>
        | undefined;
      const userName = userMeta?.name;

      return {
        message: 'User registered successfully',
        access_token: token,
        user: {
          id: loginResult.data.user.id,
          email: loginResult.data.user.email,
          name: userName ?? name,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const lowerMessage = errorMessage.toLowerCase();

      // Detect network/connection errors
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

      // Handle specific Supabase errors
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

    try {
      // Sign in with retry logic
      const result = await this.withRetry(
        async () => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            throw error;
          }
          return data;
        },
        'signIn',
      );

      if (!result?.user) {
        throw new BadRequestException('Invalid email or password');
      }

      const payload = { sub: result.user.id, email: result.user.email };
      const token = this.jwtService.sign(payload);

      const userMeta = result.user.user_metadata as
        | Record<string, string>
        | undefined;
      const userName = userMeta?.name;

      return {
        message: 'Login successful',
        access_token: token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: userName ?? 'No name',
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const lowerMessage = errorMessage.toLowerCase();

      // Detect network/connection errors
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

      // Handle invalid credentials
      if (lowerMessage.includes('invalid') && lowerMessage.includes('credentials')) {
        throw new BadRequestException('Invalid email or password');
      }

      throw new BadRequestException({
        message: 'Login failed',
        error: errorMessage,
      });
    }
  }
}
