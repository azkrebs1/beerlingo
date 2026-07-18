import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './lib/auth';
import { colors } from './lib/theme';
import AuthScreen from './screens/AuthScreen';
import StreakScreen from './screens/StreakScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import { cancelReminders, ensureRemindersScheduled } from './lib/notifications';
import { registerPushToken } from './lib/push';

function Main() {
  const { loading, user, signOut } = useAuth();
  // Bumped after each check-in so the leaderboard below reloads immediately.
  const [refreshKey, setRefreshKey] = useState(0);

  // Once signed in: schedule the recurring reminders and register this device
  // for "someone drank" push alerts.
  useEffect(() => {
    if (user) {
      ensureRemindersScheduled();
      registerPushToken(user.id);
    }
  }, [user?.id]);

  const handleSignOut = async () => {
    await cancelReminders();
    await signOut();
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.greeting} numberOfLines={1}>
          Hey {user.username} 🍺
        </Text>
        <Pressable onPress={handleSignOut} hitSlop={8}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      {/* Top ~60%: tap anywhere here to log a beer. */}
      <View style={styles.streakArea}>
        <StreakScreen onCheckIn={() => setRefreshKey((k) => k + 1)} />
      </View>

      {/* Bottom ~40%: live top-5 leaderboard. */}
      <View style={styles.leaderboardArea}>
        <LeaderboardScreen refreshKey={refreshKey} />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Main />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  greeting: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  signOut: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  // 3 : 2 split => roughly 60% streak / 40% leaderboard of the area below the header.
  streakArea: { flex: 3 },
  leaderboardArea: { flex: 2, borderTopColor: colors.border, borderTopWidth: 1 },
});
