import { useEffect, useRef } from 'react';
import { logEvent, setRoomState, setRoomWinner } from '@/firebase/rooms';
import { selectMe, useRoomStore } from '../store';
import { currentPhase, detectFinish, timeRemainingSec } from '../race';
import { notify } from '../notifications';

export function useRaceLoop(): void {
  const code = useRoomStore((s) => s.code);
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore(selectMe);
  const players = useRoomStore((s) => s.players);
  const events = useRoomStore((s) => s.events);
  const lastEventCount = useRef(0);
  const isHost = me?.uid && room?.hostUid === me.uid;

  useEffect(() => {
    if (!code || !room || !isHost) return;
    if (room.mode !== 'race') return;
    if (currentPhase(room) !== 'running') return;
    const raceRoom = room;

    const interval = setInterval(async () => {
      if (timeRemainingSec(raceRoom) <= 0 && raceRoom.state !== 'ended') {
        await Promise.all([setRoomWinner(code, 'draw'), setRoomState(code, 'ended')]);
        return;
      }
      for (const racer of players) {
        if (!detectFinish(raceRoom, racer)) continue;
        await Promise.all([
          logEvent(code, {
            type: 'race-finish',
            uid: racer.uid,
            team: racer.team ?? 'red',
            stationId: raceRoom.config.toStationId ?? '',
            at: Date.now(),
          }),
          setRoomWinner(code, racer.team ?? 'red'),
          setRoomState(code, 'ended'),
        ]);
        return;
      }
    }, 2_000);

    return () => clearInterval(interval);
  }, [code, room, players, isHost]);

  useEffect(() => {
    if (events.length <= lastEventCount.current) {
      lastEventCount.current = events.length;
      return;
    }
    const fresh = events.slice(lastEventCount.current);
    lastEventCount.current = events.length;
    for (const ev of fresh) {
      if (ev.type === 'race-finish') {
        notify('Race over', `${ev.team} team reached the destination first.`);
      } else if (ev.type === 'curse-throw') {
        const isMyTeam = me?.team === ev.targetTeam;
        notify(
          isMyTeam ? 'You were cursed!' : 'Curse thrown',
          `${ev.targetTeam} team got hit with ${ev.cardId}.`,
        );
      }
    }
  }, [events, me?.team]);
}
