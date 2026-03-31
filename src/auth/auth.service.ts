// import {
//   Injectable,
//   BadRequestException,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { supabaseAdmin } from '../config/supabase.client';
// import { RegisterDto } from './dto/register.dto';
// import { LoginDto } from './dto/login.dto';
// import { AdminUserAttributes } from '@supabase/supabase-js';

// const MAX_RETRIES = 3;
// const RETRY_DELAY_MS = 1000;

// @Injectable()
// export class AuthService {
//   constructor(private jwtService: JwtService) {}

//   private async withRetry<T>(
//     operation: () => Promise<T>,
//     _operationName: string = 'operation', // FIXED: Added underscore to unused variable
//   ): Promise<T> {
//     let lastError: Error | null = null;
//     for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//       try {
//         return await operation();
//       } catch (err: unknown) { // FIXED: Changed to unknown
//         const error = err instanceof Error ? err : new Error(String(err));
//         const errorMessage = error.message.toLowerCase();
//         const isRetryable =
//           errorMessage.includes('fetch failed') ||
//           errorMessage.includes('network') ||
//           errorMessage.includes('connection') ||
//           errorMessage.includes('timeout') ||
//           errorMessage.includes('econnrefused');

//         lastError = error;
//         if (isRetryable && attempt < MAX_RETRIES) {
//           const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
//           await new Promise((resolve) => setTimeout(resolve, delay));
//           continue;
//         }
//         throw error;
//       }
//     }
//     throw lastError ?? new Error('Operation failed');
//   }

//   // --- GOOGLE METHODS ---
//   async signInWithGoogle() {
//     const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
//       provider: 'google',
//       options: { redirectTo: process.env.SUPABASE_REDIRECT_URL },
//     });
//     if (error) throw new BadRequestException(error.message);
//     return { url: data.url };
//   }

//   async registerWithGoogle() {
//     return this.signInWithGoogle();
//   }

//   async handleOAuthCallback(code: string) {
//     const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);
//     if (error || !data.user) throw new BadRequestException('OAuth failed');

//     const payload = { sub: data.user.id, email: data.user.email };
//     const token = this.jwtService.sign(payload);

//     return {
//       message: 'OAuth successful',
//       access_token: token,
//       user: { id: data.user.id, email: data.user.email },
//     };
//   }

//   // --- CORE AUTH METHODS ---
//   async register(registerDto: RegisterDto) {
//     const { name, email, password } = registerDto;
//     try {
//       await this.withRetry(async () => {
//         const { error } = await supabaseAdmin.auth.signUp({
//           email,
//           password,
//           options: { data: { name } },
//         });
//         if (error) throw error;
//       }, 'signUp');

//       const loginResult = await this.withRetry(async () => {
//         const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
//         if (error) throw error;
//         return data;
//       }, 'signIn');

//       const payload = { sub: loginResult.user.id, email: loginResult.user.email };
//       const token = this.jwtService.sign(payload);

//       return {
//         message: 'User registered successfully',
//         access_token: token,
//         user: { id: loginResult.user.id, email: loginResult.user.email, name },
//       };
//     } catch (err: unknown) { // FIXED: changed to unknown
//       const errorMessage = err instanceof Error ? err.message : 'Registration failed';
//       console.error('CRITICAL REGISTRATION ERROR:', errorMessage);
//       throw new BadRequestException(errorMessage);
//     }
//   }

//   async login(loginDto: LoginDto) {
//     const { email, password } = loginDto;
//     try {
//       const data = await this.withRetry(async () => {
//         const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
//         if (error) throw error;
//         return data;
//       }, 'signIn');

//       const payload = { sub: data.user.id, email: data.user.email };
//       const token = this.jwtService.sign(payload);

//       return {
//         message: 'Login successful',
//         access_token: token,
//         user: { id: data.user.id, email: data.user.email },
//       };
//     } catch (_err: unknown) { // FIXED: Renamed to _err (unused) and typed
//       throw new UnauthorizedException('Invalid email or password');
//     }
//   }

//   // --- ACCOUNT UPDATE METHOD ---
//   async updateAccount(userId: string, newEmail?: string, newPassword?: string) {
//     if (!userId) throw new BadRequestException('UserId is required');

//     // FIXED: Use proper Supabase type instead of any
//     const attributes: AdminUserAttributes = {};
//     if (newEmail) attributes.email = newEmail;
//     if (newPassword) attributes.password = newPassword;

//     const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, attributes);
//     if (error) throw new BadRequestException(error.message);

//     return { message: 'Account updated successfully', user: data.user };
//   }
// }

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { supabaseAdmin } from '../config/supabase.client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AdminUserAttributes } from '@supabase/supabase-js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // FIXED: Removed the unused _operationName argument entirely
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        const errorMessage = error.message.toLowerCase();
        const isRetryable =
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('network') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('econnrefused');

        lastError = error;
        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError ?? new Error('Operation failed');
  }

  // --- GOOGLE METHODS ---
  async signInWithGoogle() {
    const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: process.env.SUPABASE_REDIRECT_URL },
    });
    if (error) throw new BadRequestException(error.message);
    return { url: data.url };
  }

  async registerWithGoogle() {
    return this.signInWithGoogle();
  }

  async handleOAuthCallback(code: string) {
    const { data, error } =
      await supabaseAdmin.auth.exchangeCodeForSession(code);
    if (error || !data.user) throw new BadRequestException('OAuth failed');

    const payload = { sub: data.user.id, email: data.user.email };
    const token = this.jwtService.sign(payload);

    return {
      message: 'OAuth successful',
      access_token: token,
      user: { id: data.user.id, email: data.user.email },
    };
  }

  // --- CORE AUTH METHODS ---
  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;
    try {
      // FIXED: Removed 'signUp' string as withRetry no longer takes a name
      await this.withRetry(async () => {
        const { error } = await supabaseAdmin.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
      });

      // FIXED: Removed 'signIn' string
      const loginResult = await this.withRetry(async () => {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        return data;
      });

      const payload = {
        sub: loginResult.user.id,
        email: loginResult.user.email,
      };
      const token = this.jwtService.sign(payload);

      return {
        message: 'User registered successfully',
        access_token: token,
        user: { id: loginResult.user.id, email: loginResult.user.email, name },
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed';
      console.error('CRITICAL REGISTRATION ERROR:', errorMessage);
      throw new BadRequestException(errorMessage);
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    try {
      const data = await this.withRetry(async () => {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        return data;
      });

      const payload = { sub: data.user.id, email: data.user.email };
      const token = this.jwtService.sign(payload);

      return {
        message: 'Login successful',
        access_token: token,
        user: { id: data.user.id, email: data.user.email },
      };
    } catch {
      // FIXED: Removed (_err: unknown) entirely.
      // JavaScript/TypeScript allows 'catch' without a variable.
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  // --- ACCOUNT UPDATE METHOD ---
  async updateAccount(userId: string, newEmail?: string, newPassword?: string) {
    if (!userId) throw new BadRequestException('UserId is required');

    const attributes: AdminUserAttributes = {};
    if (newEmail) attributes.email = newEmail;
    if (newPassword) attributes.password = newPassword;

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      attributes,
    );
    if (error) throw new BadRequestException(error.message);

    return { message: 'Account updated successfully', user: data.user };
  }
}
