import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('google')
  async signInWithGoogle() {
    return this.authService.signInWithGoogle();
  }

  @Post('google/register')
  async registerWithGoogle() {
    return this.authService.registerWithGoogle();
  }

  @Get('callback')
  async handleOAuthCallback(@Query('code') code: string) {
    return this.authService.handleOAuthCallback(code);
  }
}
