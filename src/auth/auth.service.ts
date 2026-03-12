import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { supabase } from '../config/supabase.client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();

        if (msg.includes('already registered')) {
          throw new BadRequestException('Email already registered');
        }
        if (msg.includes('rate limit')) {
          throw new BadRequestException(
            'Too many registration attempts. Please wait a few minutes and try again.',
          );
        }

        throw new BadRequestException(signUpError.message);
      }

      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError || !loginData.user) {
        throw new BadRequestException('Failed to log in after registration');
      }

      const payload = { sub: loginData.user.id, email: loginData.user.email };
      const token = this.jwtService.sign(payload);

      const userMeta = loginData.user.user_metadata as
        | Record<string, string>
        | undefined;
      const userName = userMeta?.name;

      return {
        message: 'Wow user registered successfully',
        access_token: token,
        user: {
          id: loginData.user.id,
          email: loginData.user.email,
          name: userName ?? name,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException({
        message: 'Sorry registration failed',
        error: errorMessage,
      });
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        throw new BadRequestException('Invalid email or password');
      }

      const payload = { sub: data.user.id, email: data.user.email };
      const token = this.jwtService.sign(payload);

      const userMeta = data.user.user_metadata as
        | Record<string, string>
        | undefined;
      const userName = userMeta?.name;

      return {
        message: 'Login successful',
        access_token: token,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: userName ?? 'No name',
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException({
        message: 'Login failed',
        error: errorMessage,
      });
    }
  }
}
