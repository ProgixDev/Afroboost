import * as WebBrowser from 'expo-web-browser';
import { apiMutate } from './client';

/**
 * Start a Stripe checkout for the given plan. Returns whether a hosted checkout
 * was opened; when false (demo mode / no API), the caller should fall back to
 * the in-app mock payment flow.
 */
export async function startCheckout(
  plan: string,
  annual: boolean,
): Promise<{ opened: boolean }> {
  const res = await apiMutate<{ url: string }>('/api/billing/checkout', {
    method: 'POST',
    body: { plan, annual },
  });
  if (res?.url) {
    await WebBrowser.openBrowserAsync(res.url);
    return { opened: true };
  }
  return { opened: false };
}
