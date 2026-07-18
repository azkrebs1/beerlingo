import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase, type Profile } from '../lib/supabase';
import { colors } from '../lib/theme';

// Only ever show the top few. If fewer people exist, we just show that many.
const MAX_ROWS = 5;

export default function LeaderboardScreen({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const { user } = useAuth();
  const myId = user?.id;

  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('current_streak', { ascending: false })
      .order('username', { ascending: true })
      .limit(MAX_ROWS);
    if (error) setError(error.message);
    else {
      setRows((data as Profile[]) ?? []);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Reload on mount and whenever a beer is logged upstairs (refreshKey changes).
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '');

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🏆 Leaderboard</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No one yet. Be the first to drink 🍺</Text>
        }
        renderItem={({ item, index }) => {
          const isMe = item.id === myId;
          return (
            <View style={[styles.rowItem, isMe && styles.rowItemMe]}>
              <Text style={styles.rank}>{medal(index) || index + 1}</Text>
              <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
                {item.username}
                {isMe ? ' (you)' : ''}
              </Text>
              <Text style={styles.streak}>{item.current_streak} 🔥</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  list: { paddingHorizontal: 16, paddingBottom: 12 },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rowItemMe: { borderWidth: 1.5, borderColor: colors.accent },
  rank: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
    width: 34,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  nameMe: { color: colors.accent },
  streak: { color: colors.text, fontSize: 16, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
  error: { color: colors.danger, textAlign: 'center', marginBottom: 8 },
});
