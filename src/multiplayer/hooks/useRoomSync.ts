import { useEffect } from 'react';
import {
  subscribeToEvents,
  subscribeToHints,
  subscribeToPlayers,
  subscribeToQuestions,
  subscribeToRoom,
} from '@/firebase/rooms';
import { useRoomStore } from '../store';

/**
 * Mounts Firestore listeners for the current room code and pipes room /
 * players / events / questions / hints into the Zustand store.
 */
export function useRoomSync(): void {
  const code = useRoomStore((s) => s.code);
  const setRoom = useRoomStore((s) => s.setRoom);
  const setPlayers = useRoomStore((s) => s.setPlayers);
  const setEvents = useRoomStore((s) => s.setEvents);
  const setQuestions = useRoomStore((s) => s.setQuestions);
  const setHints = useRoomStore((s) => s.setHints);

  useEffect(() => {
    if (!code) return;
    const unsubs = [
      subscribeToRoom(code, (room) => setRoom(room)),
      subscribeToPlayers(code, (players) => setPlayers(players)),
      subscribeToEvents(code, (events) => setEvents(events)),
      subscribeToQuestions(code, (questions) => setQuestions(questions)),
      subscribeToHints(code, (hints) => setHints(hints)),
    ];
    return () => {
      for (const u of unsubs) u();
    };
  }, [code, setRoom, setPlayers, setEvents, setQuestions, setHints]);
}
