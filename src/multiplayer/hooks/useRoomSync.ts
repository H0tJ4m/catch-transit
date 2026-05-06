import { useEffect } from 'react';
import {
  subscribeToEvents,
  subscribeToPlayers,
  subscribeToRoom,
} from '@/firebase/rooms';
import { useRoomStore } from '../store';

/**
 * Mounts Firestore listeners for the current room code in the store and pipes
 * room/players/events into the Zustand store. Unsubscribes on unmount.
 */
export function useRoomSync(): void {
  const code = useRoomStore((s) => s.code);
  const setRoom = useRoomStore((s) => s.setRoom);
  const setPlayers = useRoomStore((s) => s.setPlayers);
  const setEvents = useRoomStore((s) => s.setEvents);

  useEffect(() => {
    if (!code) return;
    const unsubRoom = subscribeToRoom(code, (room) => setRoom(room));
    const unsubPlayers = subscribeToPlayers(code, (players) => setPlayers(players));
    const unsubEvents = subscribeToEvents(code, (events) => setEvents(events));
    return () => {
      unsubRoom();
      unsubPlayers();
      unsubEvents();
    };
  }, [code, setRoom, setPlayers, setEvents]);
}
