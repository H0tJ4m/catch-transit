import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from './config';
import {
  DEFAULT_HIDE_SEEK_CONFIG,
  DEFAULT_TAG_CONFIG,
  type HideSeekConfig,
  type Hint,
  type Player,
  type PlayerFix,
  type PlayerRole,
  type Question,
  type Room,
  type RoomEvent,
  type RoomMode,
  type RoomState,
} from '@/multiplayer/types';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 4;

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

const roomDoc = (code: string) => doc(getDb(), 'rooms', code);
const playersCol = (code: string) => collection(getDb(), 'rooms', code, 'players');
const playerDoc = (code: string, uid: string) =>
  doc(getDb(), 'rooms', code, 'players', uid);
const eventsCol = (code: string) => collection(getDb(), 'rooms', code, 'events');
const questionsCol = (code: string) => collection(getDb(), 'rooms', code, 'questions');
const questionDoc = (code: string, id: string) =>
  doc(getDb(), 'rooms', code, 'questions', id);
const hintsCol = (code: string) => collection(getDb(), 'rooms', code, 'hints');

type CreateRoomOpts =
  | { mode: 'tag' }
  | { mode: 'hide-seek'; zone?: HideSeekConfig['zone'] };

export async function createRoom(
  hostUid: string,
  hostName: string,
  opts: CreateRoomOpts = { mode: 'tag' },
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const ref = roomDoc(code);
    const created = await runTransaction(getDb(), async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return false;
      const base = {
        code,
        hostUid,
        createdAt: Date.now(),
        state: 'lobby' as RoomState,
        startedAt: null,
        endedAt: null,
        winner: null,
      };
      const room: Room =
        opts.mode === 'tag'
          ? {
              ...base,
              mode: 'tag',
              config: DEFAULT_TAG_CONFIG,
              runnerUid: hostUid,
            }
          : {
              ...base,
              mode: 'hide-seek',
              config: { ...DEFAULT_HIDE_SEEK_CONFIG, zone: opts.zone ?? 'all-mmr' },
              hiderUid: hostUid,
            };
      tx.set(ref, room);
      return true;
    });
    if (created) {
      const role: PlayerRole = opts.mode === 'tag' ? 'runner' : 'hider';
      const startingCoins = opts.mode === 'hide-seek' ? DEFAULT_HIDE_SEEK_CONFIG.startingCoins : 0;
      await joinRoom(code, hostUid, hostName, role, startingCoins);
      return code;
    }
  }
  throw new Error('Could not allocate a room code. Try again.');
}

export async function joinRoom(
  code: string,
  uid: string,
  name: string,
  defaultRole: PlayerRole = 'chaser',
  startingCoins = 0,
): Promise<void> {
  const room = await getDoc(roomDoc(code));
  if (!room.exists()) throw new Error(`Room ${code} not found.`);
  const data = room.data() as Room;
  const role: PlayerRole =
    defaultRole !== 'chaser' ? defaultRole : data.mode === 'hide-seek' ? 'seeker' : 'chaser';
  const coins = data.mode === 'hide-seek' ? data.config.startingCoins : startingCoins;
  const playerRef = playerDoc(code, uid);
  const existing = await getDoc(playerRef);
  if (existing.exists()) {
    await updateDoc(playerRef, { online: true, name });
    return;
  }
  const player: Player = {
    uid,
    name,
    role,
    online: true,
    score: 0,
    coins,
    joinedAt: Date.now(),
    lastFix: null,
    lastStationId: null,
  };
  await setDoc(playerRef, player);
}

export async function leaveRoom(code: string, uid: string): Promise<void> {
  await updateDoc(playerDoc(code, uid), { online: false }).catch(() => {});
}

export async function setRoomState(code: string, state: RoomState): Promise<void> {
  const patch: Record<string, unknown> = { state };
  if (state === 'running') patch.startedAt = Date.now();
  if (state === 'ended') patch.endedAt = Date.now();
  await updateDoc(roomDoc(code), patch);
}

export async function setRoomWinner(code: string, winner: string): Promise<void> {
  await updateDoc(roomDoc(code), { winner });
}

export async function setRunner(code: string, uid: string): Promise<void> {
  await updateDoc(roomDoc(code), { runnerUid: uid });
}

export async function setPlayerRole(
  code: string,
  uid: string,
  role: PlayerRole,
): Promise<void> {
  await updateDoc(playerDoc(code, uid), { role });
}

export async function setPlayerCoins(
  code: string,
  uid: string,
  coins: number,
): Promise<void> {
  await updateDoc(playerDoc(code, uid), { coins });
}

export async function setHiderStation(code: string, stationId: string): Promise<void> {
  await updateDoc(roomDoc(code), {
    'config.hiderStationId': stationId,
  });
}

export async function lockHider(code: string): Promise<void> {
  await updateDoc(roomDoc(code), {
    'config.hiderLocked': true,
  });
}

export async function setHideSeekZone(
  code: string,
  zone: HideSeekConfig['zone'],
): Promise<void> {
  await updateDoc(roomDoc(code), { 'config.zone': zone });
}

export async function publishLocation(
  code: string,
  uid: string,
  fix: PlayerFix,
  stationId: string | null,
): Promise<void> {
  await updateDoc(playerDoc(code, uid), {
    lastFix: fix,
    lastStationId: stationId,
    online: true,
  });
}

export async function logEvent(code: string, event: RoomEvent): Promise<void> {
  await addDoc(eventsCol(code), { ...event, _serverTime: serverTimestamp() });
}

export async function askQuestion(
  code: string,
  askerUid: string,
  askerName: string,
  text: string,
): Promise<void> {
  await addDoc(questionsCol(code), {
    askerUid,
    askerName,
    text,
    answer: null,
    askedAt: Date.now(),
    answeredAt: null,
  });
}

export async function answerQuestion(
  code: string,
  questionId: string,
  answer: 'yes' | 'no' | 'unknown',
): Promise<void> {
  await updateDoc(questionDoc(code, questionId), {
    answer,
    answeredAt: Date.now(),
  });
}

export async function logHint(code: string, hint: Omit<Hint, 'id'>): Promise<void> {
  await addDoc(hintsCol(code), hint);
}

export function subscribeToRoom(
  code: string,
  onUpdate: (room: Room | null) => void,
): () => void {
  return onSnapshot(roomDoc(code), (snap) => {
    onUpdate(snap.exists() ? (snap.data() as Room) : null);
  });
}

export function subscribeToPlayers(
  code: string,
  onUpdate: (players: Player[]) => void,
): () => void {
  return onSnapshot(playersCol(code), (snap) => {
    onUpdate(snap.docs.map((d) => d.data() as Player));
  });
}

export function subscribeToEvents(
  code: string,
  onUpdate: (events: RoomEvent[]) => void,
): () => void {
  return onSnapshot(query(eventsCol(code), orderBy('at', 'asc')), (snap) => {
    onUpdate(snap.docs.map((d) => d.data() as RoomEvent));
  });
}

export function subscribeToQuestions(
  code: string,
  onUpdate: (questions: Question[]) => void,
): () => void {
  return onSnapshot(query(questionsCol(code), orderBy('askedAt', 'asc')), (snap) => {
    onUpdate(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Question, 'id'>) })),
    );
  });
}

export function subscribeToHints(
  code: string,
  onUpdate: (hints: Hint[]) => void,
): () => void {
  return onSnapshot(query(hintsCol(code), orderBy('askedAt', 'asc')), (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Hint, 'id'>) })));
  });
}
