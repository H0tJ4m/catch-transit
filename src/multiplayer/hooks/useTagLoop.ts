import { useEffect, useRef } from 'react';
import {
  logEvent,
  setPlayerRole,
  setRoomState,
  setRunner,
} from '@/firebase/rooms';
import {
  CAPTURE_POINTS,
  currentPhase,
  detectCapture,
  timeRemainingSec,
} from '../tagEngine';
import { selectMe, selectRunner, useRoomStore } from '../store';
import { notify } from '../notifications';
import type { Player } from '../types';

/**
 * Drives the tag round client-side. Only the room host runs the authoritative
 * checks (capture detection, timer end). Other clients passively render the
 * resulting state pushed via Firestore. Local notifications fire on important
 * events for everyone.
 */
export function useTagLoop(): void {
  const code = useRoomStore((s) => s.code);
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore(selectMe);
  const runner = useRoomStore(selectRunner);
  const players = useRoomStore((s) => s.players);
  const events = useRoomStore((s) => s.events);

  const lastEventCount = useRef(0);
  const isHost = me?.uid && room?.hostUid === me.uid;

  useEffect(() => {
    if (!code || !room || !isHost) return;
    if (room.mode !== 'tag') return;
    if (currentPhase(room) !== 'running') return;
    const tagRoom = room;

    const interval = setInterval(async () => {
      if (timeRemainingSec(tagRoom) <= 0 && tagRoom.state !== 'ended') {
        await setRoomState(code, 'ended');
        return;
      }
      if (!runner) return;
      for (const chaser of players) {
        if (chaser.uid === runner.uid) continue;
        if (!detectCapture(runner, chaser, tagRoom.config.captureRadiusM)) continue;
        await onCapture(code, runner, chaser);
        break;
      }
    }, 2_000);

    return () => clearInterval(interval);
  }, [code, room, runner, players, isHost]);

  useEffect(() => {
    if (events.length <= lastEventCount.current) {
      lastEventCount.current = events.length;
      return;
    }
    const fresh = events.slice(lastEventCount.current);
    lastEventCount.current = events.length;
    for (const ev of fresh) {
      if (ev.type === 'capture') {
        const isMe = me?.uid && (ev.capturedUid === me.uid || ev.capturerUid === me.uid);
        notify(
          isMe && ev.capturedUid === me?.uid ? 'You were tagged!' : 'Capture',
          `Runner caught at station ${ev.stationId}.`,
        );
      }
    }
  }, [events, me?.uid]);
}

async function onCapture(code: string, runner: Player, capturer: Player): Promise<void> {
  await logEvent(code, {
    type: 'capture',
    capturerUid: capturer.uid,
    capturedUid: runner.uid,
    stationId: runner.lastStationId ?? '',
    at: Date.now(),
  });
  // Rotate roles: capturer becomes runner, previous runner becomes chaser.
  await Promise.all([
    setPlayerRole(code, runner.uid, 'chaser'),
    setPlayerRole(code, capturer.uid, 'runner'),
    setRunner(code, capturer.uid),
    logEvent(code, { type: 'role-change', uid: capturer.uid, role: 'runner', at: Date.now() }),
    logEvent(code, { type: 'role-change', uid: runner.uid, role: 'chaser', at: Date.now() }),
  ]);
  // Note: scoring happens implicitly via points system; we keep CAPTURE_POINTS
  // as a constant for future on-device leaderboards.
  void CAPTURE_POINTS;
}
