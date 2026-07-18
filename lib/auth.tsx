import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, type Profile } from './supabase';

// The signed-in person's id is remembered on the device so they stay logged in
// between app launches. Signing in again elsewhere is just typing the same name.
const STORAGE_KEY = 'beerlingo.userId';

type AuthContextValue = {
  user: Profile | null;
  loading: boolean;
  // Find-or-create a profile by name. No password: typing a name *is* the login.
  signIn: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Re-fetch the current user from the server (e.g. after a check-in).
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchById(id: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // On launch, restore the remembered user (if any) and refresh their streak.
  useEffect(() => {
    (async () => {
      try {
        const savedId = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedId) {
          const profile = await fetchById(savedId);
          if (profile) {
            setUser(profile);
          } else {
            // Row was deleted (e.g. schema reset); forget the stale id.
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (name: string) => {
        const clean = name.trim();
        if (!clean) throw new Error('Please enter a name.');

        // Case-insensitive lookup so "Alex" and "alex" are the same person.
        // `ilike` with no wildcards matches the whole string, case-insensitively.
        const { data: existing, error: findError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', clean)
          .limit(1)
          .maybeSingle();
        if (findError) throw findError;

        if (existing) {
          const profile = existing as Profile;
          await AsyncStorage.setItem(STORAGE_KEY, profile.id);
          setUser(profile);
          return;
        }

        // No one by that name yet -> create them.
        const { data: created, error: insertError } = await supabase
          .from('profiles')
          .insert({ username: clean })
          .select('*')
          .single();

        if (insertError) {
          // Someone created the same name in a race between our lookup and
          // insert (unique index on lower(username)). Fall back to signing in.
          if (insertError.code === '23505') {
            const { data: raced } = await supabase
              .from('profiles')
              .select('*')
              .ilike('username', clean)
              .limit(1)
              .maybeSingle();
            if (raced) {
              const profile = raced as Profile;
              await AsyncStorage.setItem(STORAGE_KEY, profile.id);
              setUser(profile);
              return;
            }
          }
          throw insertError;
        }

        const profile = created as Profile;
        await AsyncStorage.setItem(STORAGE_KEY, profile.id);
        setUser(profile);
      },
      signOut: async () => {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setUser(null);
      },
      refresh: async () => {
        if (!user) return;
        const fresh = await fetchById(user.id);
        if (fresh) setUser(fresh);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
