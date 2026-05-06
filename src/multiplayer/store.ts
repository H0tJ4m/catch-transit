import { create } from 'zustand';
import type { Player, Room, RoomEvent } from './types';

type State = {
  code: string | null;
  uid: string | null;
  displayName: string;
  room: Room | null;
  players: Player[];
  events: RoomEvent[];
};

type Actions = {
  setIdentity: (uid: string, displayName: string) => void;
  setRoomCode: (code: string | null) => void;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  setEvents: (events: RoomEvent[]) => void;
  reset: () => void;
};

const initial: State = {
  code: null,
  uid: null,
  displayName: 'Player',
  room: null,
  players: [],
  events: [],
};

export const useRoomStore = create<State & Actions>((set) => ({
  ...initial,
  setIdentity: (uid, displayName) => set({ uid, displayName }),
  setRoomCode: (code) => set({ code }),
  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  setEvents: (events) => set({ events }),
  reset: () => set({ ...initial }),
}));

export const selectMe = (s: State): Player | null =>
  s.uid ? s.players.find((p) => p.uid === s.uid) ?? null : null;

export const selectRunner = (s: State): Player | null =>
  s.room?.runnerUid ? s.players.find((p) => p.uid === s.room?.runnerUid) ?? null : null;

export const selectChasers = (s: State): Player[] =>
  s.room?.runnerUid ? s.players.filter((p) => p.uid !== s.room?.runnerUid) : s.players;
