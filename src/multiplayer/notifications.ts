import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { isFirebaseConfigured } from '@/firebase/config';
import { savePushToken } from '@/firebase/users';

let configured = false;

export async function configureNotifications(uid?: string | null): Promise<void> {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted' || !uid || !isFirebaseConfigured) return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const token = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      )
    ).data;
    if (token) await savePushToken(uid, token);
  } catch {
    // Push tokens are best-effort. Local notifications still work without them.
  }
}

export async function notify(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // ignore
  }
}
