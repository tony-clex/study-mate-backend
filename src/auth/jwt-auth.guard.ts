import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7);

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      // Attach user info to request for use in controllers
      request.user = payload;
      request.userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }
}
