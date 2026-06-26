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
    '/api/integrations/meta/connect?platform=mobile',
  );
  // The backend callback redirects to afroboost://settings/accounts on success
  // (or with ?error=meta on failure); the auth session closes on that deep link.
  const result = await WebBrowser.openAuthSessionAsync(
    url,
    'afroboost://settings/accounts',
  );
  if (result.type === 'success' && result.url.includes('error=meta')) {
    throw new Error('Meta connection failed');
  }
}
