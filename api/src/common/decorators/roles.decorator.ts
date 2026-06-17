import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../types';

export const ROLES_KEY = 'roles';

/** Restrict an admin route to one or more roles (used with RolesGuard). */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
