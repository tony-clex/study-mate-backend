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
      // Use Supabase to verify the JWT token
      const { data: user, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      request.user = {
        sub: user.user.id,
        email: user.user.email,
      };
      request.userId = user.user.id;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
