import { supabase } from '@/lib/supabase';

/** Backend base URL, e.g. http://localhost:3333. Unset → app runs on mocks. */
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiConfigured(): boolean {
  return !!API_URL;
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Abort the request after this many ms (default 20s) so it never hangs. */
  timeoutMs?: number;
};

/**
 * Authenticated request against the NestJS API. Attaches the Supabase access
 * token (the backend's OwnerAuthGuard expects it). Throws ApiError on failure,
 * and never hangs forever — it aborts after `timeoutMs`.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) throw new ApiError('API not configured', 0);

  const { timeoutMs = 20000, ...init } = options;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    throw new ApiError(
      aborted ? `Request timed out after ${timeoutMs}ms` : `Network error: ${(e as Error).message}`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { message?: string | string[] };
      if (err?.message) message = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Read helper with demo-safe fallback: when the API is unconfigured or a request
 * fails, returns the provided mock so the app stays usable offline / in demos.
 */
export async function apiQuery<T>(path: string, mock: T): Promise<T> {
  if (!API_URL) return mock;
  try {
    return await apiRequest<T>(path);
  } catch (e) {
    if (__DEV__) {
      console.warn(`[api] GET ${path} failed → mock fallback:`, (e as Error).message);
    }
    return mock;
  }
}

/**
 * Mutation helper that no-ops gracefully when the API isn't configured, so
 * optimistic UI flows still work in demo mode.
 */
export async function apiMutate<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T | null> {
  if (!API_URL) return null;
  try {
    return await apiRequest<T>(path, options);
  } catch (e) {
    if (__DEV__) {
      console.warn(`[api] ${options.method ?? 'POST'} ${path} failed:`, (e as Error).message);
    }
    return null;
  }
}
