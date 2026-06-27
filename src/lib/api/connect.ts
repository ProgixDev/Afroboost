import * as WebBrowser from 'expo-web-browser';
import { apiRequest, isApiConfigured } from './client';
import { mockDelay } from '@/lib/mock-api';

/** Thrown when the user backs out of the OAuth browser (not a real error). */
export class ConnectCancelledError extends Error {
  constructor() {
    super('Connect cancelled');
    this.name = 'ConnectCancelledError';
  }
}

/**
 * Start the real Meta (Facebook + Instagram) OAuth connect flow: fetch the
 * authorize URL from the backend and open it in an auth session. The backend
 * callback redirects to afroboost://settings/accounts?connected=meta on success.
 *
 * Resolves on success. Throws ConnectCancelledError if the user dismissed the
 * browser, or a plain Error if the backend reported a failure. In demo mode
 * (no API URL) it resolves after a short delay so the connect UI still completes.
 */
export async function connectMeta(): Promise<void> {
  if (!isApiConfigured()) {
    await mockDelay(900);
    return;
  }
  // 1. Ask the backend for the Facebook OAuth dialog URL (needs the user's
  //    Supabase session — a 401 here means "not logged in"). apiRequest has a
  //    timeout, so this can't hang forever.
  const { url } = await apiRequest<{ url: string }>(
    '/api/integrations/meta/connect',
  );
  // 2. Open it; the auth session closes when the backend redirects to our
  //    afroboost:// deep link.
  const result = await WebBrowser.openAuthSessionAsync(
    url,
    'afroboost://settings/accounts',
  );
  if (result.type !== 'success') {
    // 'cancel' / 'dismiss' — the user closed the browser without finishing.
    throw new ConnectCancelledError();
  }
  if (!result.url.includes('connected=meta')) {
    throw new Error('Meta connection failed');
  }
}

/**
 * Start the Google Business Profile (reviews) OAuth connect flow. Same shape as
 * connectMeta: the backend callback redirects to afroboost://settings/accounts
 * ?connected=google on success (or ?error=google on failure).
 */
export async function connectGoogle(): Promise<void> {
  if (!isApiConfigured()) {
    await mockDelay(900);
    return;
  }
  const { url } = await apiRequest<{ url: string }>(
    '/api/integrations/google/connect?service=google',
  );
  const result = await WebBrowser.openAuthSessionAsync(
    url,
    'afroboost://settings/accounts',
  );
  if (result.type !== 'success') {
    throw new ConnectCancelledError();
  }
  if (!result.url.includes('connected=google')) {
    throw new Error('Google connection failed');
  }
}
