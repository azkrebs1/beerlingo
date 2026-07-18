import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Reminders that keep people drinking (and their streak alive). These are LOCAL
// scheduled notifications, which work in Expo Go — no push server or dev build
// needed. See lib/auth.tsx for where this gets kicked off after sign-in.

// Show reminders as a banner even if the app happens to be open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const FOUR_HOURS_SECONDS = 4 * 60 * 60; // 14,400

// Identifiers so we can tell our own scheduled reminders apart from anything
// else and avoid stacking duplicates every time the app launches.
const EVERY_4H_ID = 'beerlingo-every-4h';
const NIGHTLY_ID = 'beerlingo-nightly-2330';

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return (
    asked.granted ||
    asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/**
 * Schedule the two recurring drink reminders:
 *   - every 4 hours
 *   - 30 minutes before midnight (23:30) every day
 *
 * Safe to call on every launch: it clears its own previous schedule first so
 * reminders never pile up. Returns false if the user denied permission.
 */
export async function ensureRemindersScheduled(): Promise<boolean> {
  if (!(await ensurePermission())) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Beer reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Wipe our previous reminders so re-running doesn't create duplicates.
  await Notifications.cancelScheduledNotificationAsync(EVERY_4H_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(NIGHTLY_ID).catch(() => {});

  // Every 4 hours.
  await Notifications.scheduleNotificationAsync({
    identifier: EVERY_4H_ID,
    content: {
      title: '🍺 Beer o’clock',
      body: 'Time for a beer — keep that streak going.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: FOUR_HOURS_SECONDS,
      repeats: true,
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : null),
    },
  });

  // 30 minutes before midnight, every day.
  await Notifications.scheduleNotificationAsync({
    identifier: NIGHTLY_ID,
    content: {
      title: '🍺 Last call!',
      body: "30 minutes to midnight — log today's beer before your streak resets.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 23,
      minute: 30,
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : null),
    },
  });

  return true;
}

/** Cancel our reminders (used on sign-out so an old account stops nagging). */
export async function cancelReminders(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(EVERY_4H_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(NIGHTLY_ID).catch(() => {});
}
