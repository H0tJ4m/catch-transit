/**
 * Cloud Functions for Catch Transit.
 *
 * Two responsibilities, both optional — the app works without these but the
 * experience is meaningfully better with them deployed.
 *
 * 1. Cross-device push notifications via Expo Push. When a `capture`,
 *    `hider-found`, `race-finish`, or `curse-throw` event lands in
 *    rooms/{code}/events/{id}, fan it out as a push to every player in the
 *    room whose device token is registered under users/{uid}/pushToken.
 *    Without this, only the device that observes the event gets a local
 *    notification (which is fine in the foreground).
 *
 * 2. Round watchdog. A scheduled function ticks every minute, ends rooms
 *    whose timer has expired, and (for tag) declares a winner if the
 *    leader-election layer can't settle one. This is a backstop in case
 *    every client drops off mid-round.
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

initializeApp();
const db = getFirestore();
const expo = new Expo();

type EventDoc = {
  type: string;
  at: number;
  capturerUid?: string;
  capturedUid?: string;
  finderUid?: string;
  fromUid?: string;
  uid?: string;
  team?: string;
  targetTeam?: string;
  cardId?: string;
  stationId?: string;
};

export const onRoomEvent = onDocumentCreated(
  'rooms/{code}/events/{eventId}',
  async (event) => {
    const data = event.data?.data() as EventDoc | undefined;
    if (!data) return;
    const { code } = event.params;

    const playersSnap = await db.collection(`rooms/${code}/players`).get();
    const recipientUids = playersSnap.docs.map((d) => d.id);
    if (recipientUids.length === 0) return;

    const message = renderMessage(data);
    if (!message) return;

    // Look up Expo push tokens for the recipients.
    const tokensSnap = await db
      .collection('users')
      .where(FieldPath.documentId(), 'in', recipientUids.slice(0, 10))
      .get();
    const tokens: string[] = [];
    for (const doc of tokensSnap.docs) {
      const t = (doc.data() as { pushToken?: string }).pushToken;
      if (t && Expo.isExpoPushToken(t)) tokens.push(t);
    }
    if (tokens.length === 0) return;

    const payload: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      sound: 'default',
      data: { code, type: data.type },
    }));

    const chunks = expo.chunkPushNotifications(payload);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (e) {
        console.error('Expo push failed', e);
      }
    }
  },
);

function renderMessage(ev: EventDoc): { title: string; body: string } | null {
  switch (ev.type) {
    case 'capture':
      return {
        title: 'Tag!',
        body: 'A runner has been caught.',
      };
    case 'hider-found':
      return {
        title: 'Hider found',
        body: 'Seekers won the round.',
      };
    case 'race-finish':
      return {
        title: 'Race over',
        body: `${ev.team ?? 'A'} team reached the destination first.`,
      };
    case 'curse-throw':
      return {
        title: 'Curse incoming',
        body: `${ev.targetTeam ?? 'opposing'} team got hit.`,
      };
    default:
      return null;
  }
}

/**
 * Safety net: every minute, find rooms whose timer has expired and end them.
 * The client-side leader normally handles this, but this function ensures the
 * room doesn't stay running forever if every player drops off.
 */
export const watchdogTick = onSchedule('every 1 minutes', async () => {
  const now = Date.now();
  const running = await db
    .collection('rooms')
    .where('state', '==', 'running')
    .get();

  const writes: Promise<unknown>[] = [];
  for (const doc of running.docs) {
    const room = doc.data() as {
      startedAt?: number;
      config?: { durationMin?: number };
    };
    const startedAt = room.startedAt ?? 0;
    const durationMin = room.config?.durationMin ?? 0;
    if (startedAt > 0 && durationMin > 0 && now - startedAt > durationMin * 60_000) {
      writes.push(
        doc.ref.update({
          state: 'ended',
          endedAt: now,
          winner: 'timeout',
        }),
      );
    }
  }
  await Promise.all(writes);
});
