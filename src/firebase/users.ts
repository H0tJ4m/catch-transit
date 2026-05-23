import { doc, setDoc } from 'firebase/firestore';
import { getDb } from './config';

/**
 * Stores the Expo push token under users/{uid}/pushToken. The Cloud Function
 * `onRoomEvent` reads this when fanning out cross-device notifications.
 */
export async function savePushToken(uid: string, token: string): Promise<void> {
  await setDoc(
    doc(getDb(), 'users', uid),
    { pushToken: token, updatedAt: Date.now() },
    { merge: true },
  );
}
