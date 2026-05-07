import { create } from 'zustand';
import type { CurseThrow, Hint, Player, Question, Room, RoomEvent } from './types';

type State = {
  code: string | null;
  uid: string | null;
  displayName: string;
  room: Room | null;
  players: Player[];
  events: RoomEvent[];
  questions: Question[];
  hints: Hint[];
  throws: CurseThrow[];
};

type Actions = {
  setIdentity: (uid: string, displayName: string) => void;
  setRoomCode: (code: string | null) => void;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  setEvents: (events: RoomEvent[]) => void;
  setQuestions: (questions: Question[]) => void;
  setHints: (hints: Hint[]) => void;
  setThrows: (throws: CurseThrow[]) => void;
  reset: () => void;
};

const initial: State = {
  code: null,
  uid: null,
  displayName: 'Player',
  room: null,
  players: [],
  events: [],
  questions: [],
  hints: [],
  throws: [],
};

export const useRoomStore = create<State & Actions>((set) => ({
  ...initial,
  setIdentity: (uid, displayName) => set({ uid, displayName }),
  setRoomCode: (code) => set({ code }),
  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  setEvents: (events) => set({ events }),
  setQuestions: (questions) => set({ questions }),
  setHints: (hints) => set({ hints }),
  setThrows: (throws) => set({ throws }),
  reset: () => set({ ...initial }),
}));

export const selectMe = (s: State): Player | null =>
  s.uid ? s.players.find((p) => p.uid === s.uid) ?? null : null;

export const selectRunner = (s: State): Player | null => {
  if (!s.room || s.room.mode !== 'tag' || !s.room.runnerUid) return null;
  const runnerUid = s.room.runnerUid;
  return s.players.find((p) => p.uid === runnerUid) ?? null;
};

export const selectChasers = (s: State): Player[] => {
  if (!s.room || s.room.mode !== 'tag') return s.players;
  const runnerUid = s.room.runnerUid;
  return s.players.filter((p) => p.uid !== runnerUid);
};

export const selectHider = (s: State): Player | null => {
  if (!s.room || s.room.mode !== 'hide-seek' || !s.room.hiderUid) return null;
  const hiderUid = s.room.hiderUid;
  return s.players.find((p) => p.uid === hiderUid) ?? null;
};

export const selectSeekers = (s: State): Player[] => {
  if (!s.room || s.room.mode !== 'hide-seek') return s.players;
  const hiderUid = s.room.hiderUid;
  return s.players.filter((p) => p.uid !== hiderUid);
};
