import * as WebBrowser from 'expo-web-browser';
import { apiRequest, isApiConfigured } from './client';
import { mockDelay } from '@/lib/mock-api';

/**
 * Start the real Meta (Facebook + Instagram) OAuth connect flow: fetch the
 * authorize URL from the backend and open it in an auth session. The backend
 * callback redirects back to the app's accounts screen.
 *
 * In demo mode (no API URL) it simply resolves after a short delay so the
 * connect UI still completes.
 */
export async function connectMeta(): Promise<void> {
  if (!isApiConfigured()) {
    await mockDelay(900);
    return;
  }
  const { url } = await apiRequest<{ url: string }>(
    '/api/integrations/meta/connect',
  );
  // The backend callback redirects to afroboost://settings/accounts?connected=meta
  // on success (or ?error=meta on failure); the auth session closes on that deep
  // link. Anything else (user dismissed/cancelled the browser, or an error came
  // back) is NOT a successful connect, so we throw and let the caller keep the
  // row "Non connecté".
  const result = await WebBrowser.openAuthSessionAsync(
    url,
    'afroboost://settings/accounts',
  );
  if (result.type !== 'success' || !result.url.includes('connected=meta')) {
    throw new Error('Meta connection cancelled or failed');
  }
}
