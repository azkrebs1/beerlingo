import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

// Cross-user push: "someone else drank a beer" alerts. Every device registers an
// Expo push token onto its profile row; when you check in, we POST to Expo's push
// API to notify everyone else's tokens directly — no backend to deploy.
//
// This needs a (free) EAS projectId in app.json (`extra.eas.projectId`, added by
// running `npx eas init`). Until that exists, registration no-ops gracefully and
// the app works fine — only the cross-user alerts stay dormant. Note: remote push
// is officially supported only in a development build; in Expo Go it may work on
// iOS but not Android.

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

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
 * Register this device for push and save the token on the user's profile row so
 * others can notify them. Best-effort: returns null (and logs why) when push
 * isn't available yet — no projectId, permission denied, web, etc.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const projectId = getProjectId();
  if (!projectId) {
    console.warn(
      'Beerlingo: no EAS projectId in app.json yet — run `npx eas init` to turn ' +
        'on cross-user push. Reminders still work without it.'
    );
    return null;
  }

  if (!(await ensurePermission())) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);
    if (error) console.warn('Beerlingo: could not save push token:', error.message);
    return token;
  } catch (e) {
    console.warn('Beerlingo: could not get Expo push token:', e);
    return null;
  }
}

/** Tell everyone else that `drinkerName` just logged a beer. Best-effort. */
export async function notifyOthersOfBeer(
  myUserId: string,
  drinkerName: string
): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .neq('id', myUserId)
    .not('expo_push_token', 'is', null);
  if (error || !data) return;

  const messages = data
    .map((r) => r.expo_push_token)
    .filter(
      (t): t is string =>
        typeof t === 'string' && t.startsWith('ExponentPushToken')
    )
    .map((to) => ({
      to,
      sound: 'default' as const,
      title: '🍺 Someone drank a beer!',
      body: `${drinkerName} just logged a beer — don't fall behind, grab one!`,
    }));

  if (messages.length === 0) return;

  try {
    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn('Beerlingo: failed to send beer push:', e);
  }
}
