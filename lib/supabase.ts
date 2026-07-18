import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced loudly so a missing .env is obvious during development.
  console.warn(
    'Missing Supabase config. Copy .env.example to .env and fill in your ' +
      'project URL and anon key (see SETUP.md).'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
  id: string;
  username: string;
  current_streak: number;
  last_check_in_date: string | null; // 'YYYY-MM-DD' in the user's local calendar
  expo_push_token: string | null; // device push token for "someone drank" alerts
  updated_at: string;
};
