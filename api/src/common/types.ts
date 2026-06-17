// Shared request-context types used by guards, decorators, and services.

export type AdminRole = 'super_admin' | 'support' | 'analyst' | 'viewer';

/** Authenticated business owner (mobile app), resolved from a Supabase JWT. */
export interface OwnerContext {
  authUserId: string;
  ownerId: string;
  tenantId: string;
  email: string;
}

/** Authenticated operator (admin console), from a backend-issued JWT. */
export interface AdminContext {
  adminId: string;
  email: string;
  role: AdminRole;
}

/** Fastify request augmented by the auth guards. */
export interface AuthedRequest {
  owner?: OwnerContext;
  admin?: AdminContext;
  headers: Record<string, string | string[] | undefined>;
}
