import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Add them to your .env file.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // AsyncStorage avoids SecureStore's 2KB limit (Supabase sessions can exceed it).
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // PKCE returns ?code=... which we exchange for a session — required for the
    // native flow in src/lib/auth.ts. (Default is 'implicit', which returns the
    // tokens in the URL fragment and would never be exchanged.)
    flowType: 'pkce',
    // URL-based session detection only makes sense on web.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
