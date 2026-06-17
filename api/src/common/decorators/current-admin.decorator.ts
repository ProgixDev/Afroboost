import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminContext, AuthedRequest } from '../types';

/** Injects the authenticated admin context (set by AdminAuthGuard). */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminContext => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.admin) throw new UnauthorizedException('No admin context');
    return req.admin;
  },
);
