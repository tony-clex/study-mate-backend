import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
  userId: string;
}

interface JwtPayload {
  sub: string;
  email?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });

      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid token payload');
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
      };
      request.userId = payload.sub;

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[JwtAuthGuard] Verification failed:', message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
