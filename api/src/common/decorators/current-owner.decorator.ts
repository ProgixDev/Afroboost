import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthedRequest, OwnerContext } from '../types';

/** Injects the authenticated owner context (set by OwnerAuthGuard). */
export const CurrentOwner = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OwnerContext => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.owner) throw new UnauthorizedException('No owner context');
    return req.owner;
  },
);

/** Injects just the tenantId of the authenticated owner. */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.owner) throw new UnauthorizedException('No owner context');
    return req.owner.tenantId;
  },
);
