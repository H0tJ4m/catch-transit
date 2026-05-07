import { useEffect, useRef } from 'react';
import { logEvent, setRoomState, setRoomWinner } from '@/firebase/rooms';
import { currentPhase, detectHiderFound, timeRemainingSec } from '../hideSeek';
import { selectHider, selectMe, selectSeekers, useRoomStore } from '../store';
import { notify } from '../notifications';
import { electLeader } from '../leader';

/**
 * Drives the host-authoritative checks for a Hide & Seek round: detect when a
 * seeker reaches the hider's station, and end the round when time runs out.
 * All clients still receive the resulting state via Firestore listeners.
 */
export function useHideSeekLoop(): void {
  const code = useRoomStore((s) => s.code);
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore(selectMe);
  const hider = useRoomStore(selectHider);
  const seekers = useRoomStore(selectSeekers);
  const players = useRoomStore((s) => s.players);
  const events = useRoomStore((s) => s.events);
  const lastEventCount = useRef(0);
  const isLeader = me?.uid && electLeader(players) === me.uid;

  useEffect(() => {
    if (!code || !room || !isLeader) return;
    if (room.mode !== 'hide-seek') return;
    if (currentPhase(room) !== 'seeking') return;

    const interval = setInterval(async () => {
      if (timeRemainingSec(room) <= 0 && room.state !== 'ended') {
        await Promise.all([setRoomWinner(code, 'hider'), setRoomState(code, 'ended')]);
        return;
      }
      if (!hider) return;
      for (const seeker of seekers) {
        if (!detectHiderFound(room, seeker)) continue;
        await Promise.all([
          logEvent(code, {
            type: 'hider-found',
            finderUid: seeker.uid,
            stationId: room.config.hiderStationId ?? '',
            at: Date.now(),
          }),
          setRoomWinner(code, 'seekers'),
          setRoomState(code, 'ended'),
        ]);
        break;
      }
    }, 2_000);

    return () => clearInterval(interval);
  }, [code, room, hider, seekers, isLeader]);

  useEffect(() => {
    if (events.length <= lastEventCount.current) {
      lastEventCount.current = events.length;
      return;
    }
    const fresh = events.slice(lastEventCount.current);
    lastEventCount.current = events.length;
    for (const ev of fresh) {
      if (ev.type === 'hider-found') {
        notify('Hider found!', `Seekers won. Round over.`);
      } else if (ev.type === 'hider-locked') {
        notify('Hider locked in', 'Seekers, you can start moving.');
      }
    }
  }, [events]);
}
