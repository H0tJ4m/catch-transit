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
  DEFAULT_ROOM_CONFIG,
  type Player,
  type PlayerFix,
  type Room,
  type RoomEvent,
  type RoomState,
} from '@/multiplayer/types';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
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

export async function createRoom(hostUid: string, hostName: string): Promise<string> {
  // Try a few codes; collisions are unlikely but possible.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const ref = roomDoc(code);
    const created = await runTransaction(getDb(), async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return false;
      const room: Room = {
        code,
        hostUid,
        createdAt: Date.now(),
        state: 'lobby',
        mode: 'tag',
        config: DEFAULT_ROOM_CONFIG,
        startedAt: null,
        endedAt: null,
        runnerUid: hostUid,
      };
      tx.set(ref, room);
      return true;
    });
    if (created) {
      await joinRoom(code, hostUid, hostName, 'runner');
      return code;
    }
  }
  throw new Error('Could not allocate a room code. Try again.');
}

export async function joinRoom(
  code: string,
  uid: string,
  name: string,
  defaultRole: 'runner' | 'chaser' = 'chaser',
): Promise<void> {
  const room = await getDoc(roomDoc(code));
  if (!room.exists()) throw new Error(`Room ${code} not found.`);
  const playerRef = playerDoc(code, uid);
  const existing = await getDoc(playerRef);
  if (existing.exists()) {
    await updateDoc(playerRef, { online: true, name });
    return;
  }
  const player: Player = {
    uid,
    name,
    role: defaultRole,
    online: true,
    score: 0,
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
  const patch: Partial<Room> = { state };
  if (state === 'running') patch.startedAt = Date.now();
  if (state === 'ended') patch.endedAt = Date.now();
  await updateDoc(roomDoc(code), patch);
}

export async function setRunner(code: string, uid: string): Promise<void> {
  await updateDoc(roomDoc(code), { runnerUid: uid });
}

export async function setPlayerRole(
  code: string,
  uid: string,
  role: 'runner' | 'chaser',
): Promise<void> {
  await updateDoc(playerDoc(code, uid), { role });
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
