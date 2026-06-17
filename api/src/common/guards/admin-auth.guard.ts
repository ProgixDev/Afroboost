import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminContext, AuthedRequest } from '../types';
import { extractBearer } from './owner-auth.guard';

/** Authenticates operators via a backend-issued JWT (see AdminAuthService). */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const secret = this.config.get<string>('ADMIN_JWT_SECRET');
    if (!secret) throw new UnauthorizedException('Admin auth is not configured');

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        role: AdminContext['role'];
      }>(token, { secret });
      req.admin = {
        adminId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired admin token');
    }
  }
}
