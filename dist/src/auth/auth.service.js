'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.AuthService = void 0;
const common_1 = require('@nestjs/common');
const jwt_1 = require('@nestjs/jwt');
const supabase_client_1 = require('../config/supabase.client');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
let AuthService = class AuthService {
  jwtService;
  constructor(jwtService) {
    this.jwtService = jwtService;
  }
  async withRetry(operation) {
    let lastError = null;
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
  async signInWithGoogle() {
    const { data, error } =
      await supabase_client_1.supabaseAdmin.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: process.env.SUPABASE_REDIRECT_URL },
      });
    if (error) throw new common_1.BadRequestException(error.message);
    return { url: data.url };
  }
  async registerWithGoogle() {
    return this.signInWithGoogle();
  }
  async handleOAuthCallback(code) {
    const { data, error } =
      await supabase_client_1.supabaseAdmin.auth.exchangeCodeForSession(code);
    if (error || !data.user)
      throw new common_1.BadRequestException('OAuth failed');
    const payload = { sub: data.user.id, email: data.user.email };
    const token = this.jwtService.sign(payload);
    return {
      message: 'OAuth successful',
      access_token: token,
      user: { id: data.user.id, email: data.user.email },
    };
  }
  async register(registerDto) {
    const { name, email, password } = registerDto;
    try {
      await this.withRetry(async () => {
        const { error } = await supabase_client_1.supabaseAdmin.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
      });
      const loginResult = await this.withRetry(async () => {
        const { data, error } =
          await supabase_client_1.supabaseAdmin.auth.signInWithPassword({
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
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed';
      console.error('CRITICAL REGISTRATION ERROR:', errorMessage);
      throw new common_1.BadRequestException(errorMessage);
    }
  }
  async login(loginDto) {
    const { email, password } = loginDto;
    try {
      const data = await this.withRetry(async () => {
        const { data, error } =
          await supabase_client_1.supabaseAdmin.auth.signInWithPassword({
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
      throw new common_1.UnauthorizedException('Invalid email or password');
    }
  }
  async updateAccount(userId, newEmail, newPassword) {
    if (!userId) throw new common_1.BadRequestException('UserId is required');
    const attributes = {};
    if (newEmail) attributes.email = newEmail;
    if (newPassword) attributes.password = newPassword;
    const { data, error } =
      await supabase_client_1.supabaseAdmin.auth.admin.updateUserById(
        userId,
        attributes,
      );
    if (error) throw new common_1.BadRequestException(error.message);
    return { message: 'Account updated successfully', user: data.user };
  }
};
AuthService = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [jwt_1.JwtService]),
  ],
  AuthService,
);
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map
