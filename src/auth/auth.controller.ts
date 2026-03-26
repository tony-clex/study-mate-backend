import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email?: string;
  };
}

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

  @UseGuards(JwtAuthGuard)
  @Post('update-account')
  async updateAccount(
    @Req() req: AuthenticatedRequest,
    @Body() body: { email?: string; password?: string },
  ) {
    const userId = req.user?.sub;

    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    return this.authService.updateAccount(userId, body.email, body.password);
  }
}
