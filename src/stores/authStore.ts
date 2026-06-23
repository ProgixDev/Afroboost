import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { apiMutate } from '@/lib/api/client';
import { signInWithGoogle as oauthGoogle, signOut as oauthSignOut } from '@/lib/auth';
import type { Session } from '@supabase/supabase-js';

type User = { id: string; email: string; name: string };
type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Hydrate from any persisted Supabase session and subscribe to changes. */
  init: () => Promise<void>;
};

const toUser = (session: Session | null): User | null => {
  const u = session?.user;
  if (!u) return null;
  const email = u.email ?? '';
  const name =
    (u.user_metadata?.full_name as string | undefined) ??
    (u.user_metadata?.name as string | undefined) ??
    email.split('@')[0] ??
    'Patrick';
  return { id: u.id, email, name };
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // The session (and user state) arrives via onAuthStateChange in init().
  },
  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Provision the tenant on the backend (best-effort; no-op without an API
    // URL or before email confirmation). Safe to call again on first sign-in.
    await apiMutate('/api/auth/register', { method: 'POST', body: { email } });
  },
  signInWithGoogle: async () => {
    await oauthGoogle();
    // Session arrives via the onAuthStateChange listener registered in init().
  },
  signOut: async () => {
    await oauthSignOut().catch(() => {});
    set({ user: null, isAuthenticated: false });
  },
  init: async () => {
    const { data } = await supabase.auth.getSession();
    const user = toUser(data.session);
    set({ user, isAuthenticated: !!user, initialized: true });

    supabase.auth.onAuthStateChange((_event, session) => {
      const u = toUser(session);
      set({ user: u, isAuthenticated: !!u });
    });
  },
}));
