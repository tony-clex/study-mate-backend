import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { supabaseAdmin } from '../config/supabase.client';

interface JwtPayload {
  sub: string;
  email?: string;
}

interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  user?: JwtPayload;
  userId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7);

    if (!token || token.length === 0) {
      throw new UnauthorizedException('Empty token');
    }

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

    return true;
  }
}
