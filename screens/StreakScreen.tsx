import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase, type Profile } from '../lib/supabase';
import { canCheckInToday, computeCheckIn } from '../lib/dates';
import { notifyOthersOfBeer } from '../lib/push';
import { colors } from '../lib/theme';

export default function StreakScreen({
  onCheckIn,
}: {
  onCheckIn?: () => void;
}) {
  const { user, refresh } = useAuth();
  const userId = user?.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scale = useRef(new Animated.Value(1)).current;

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      setError(error.message);
    } else {
      setProfile(data as Profile);
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const canCheckIn = profile
    ? canCheckInToday(profile.last_check_in_date)
    : false;

  const pulse = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, speed: 40 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const onTap = async () => {
    if (!profile || !userId || saving) return;
    const result = computeCheckIn(
      profile.current_streak,
      profile.last_check_in_date
    );
    if (result.kind === 'already-checked-in') return;

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    // Optimistic update so the tap feels instant.
    const previous = profile;
    setProfile({
      ...profile,
      current_streak: result.newStreak,
      last_check_in_date: todayStr,
    });
    pulse();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        current_streak: result.newStreak,
        last_check_in_date: todayStr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      setProfile(previous); // roll back on failure
      setError(error.message);
    } else {
      refresh(); // keep the remembered user's streak in sync
      onCheckIn?.(); // tell the leaderboard below to reload
      notifyOthersOfBeer(userId, user?.username ?? 'Someone'); // ping everyone else
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Pressable
      style={styles.container}
      onPress={onTap}
      disabled={!canCheckIn}
    >
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <View style={styles.row}>
            <Text style={styles.number}>{profile?.current_streak ?? 0}</Text>
            <Text style={styles.fire}>🔥</Text>
          </View>
        </Animated.View>

        <Text style={styles.hint}>
          {canCheckIn ? 'Tap when you drink a beer' : 'Come back tomorrow 🍺'}
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  number: {
    color: colors.text,
    fontSize: 140,
    fontWeight: '800',
    letterSpacing: -4,
  },
  fire: { fontSize: 72, marginLeft: 8 },
  hint: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 24,
  },
  error: { color: colors.danger, marginTop: 16, textAlign: 'center' },
});
