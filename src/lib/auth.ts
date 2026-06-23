import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// Ensures the in-app browser closes cleanly after the auth redirect (native).
WebBrowser.maybeCompleteAuthSession();

// Redirect target Supabase sends the user back to after Google consent.
// Native: afroboost://auth/callback  •  Web: <origin>/auth/callback
const redirectTo = Linking.createURL('/auth/callback');

/**
 * Starts the Google OAuth web-redirect flow through Supabase.
 * On web the page redirects; on native an in-app browser opens and the
 * returned URL is exchanged for a session (PKCE).
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // On native we drive the browser ourselves instead of auto-redirecting.
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw error;

  // Web: signInWithOAuth performs the redirect itself — nothing left to do.
  if (Platform.OS === 'web' || !data?.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    // User dismissed the browser or the flow was cancelled.
    return;
  }

  const params = Linking.parse(result.url).queryParams ?? {};

  // Supabase redirects back with ?error=...&error_description=... on failure
  // (e.g. provider not enabled, redirect URL not whitelisted).
  if (params.error) {
    throw new Error(
      String(params.error_description ?? params.error).replace(/\+/g, ' '),
    );
  }

  // Exchange the ?code=... returned in the redirect URL for a session.
  const { code } = params;
  if (typeof code === 'string') {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  } else {
    throw new Error('No auth code returned from Google. Check Supabase redirect URLs.');
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
