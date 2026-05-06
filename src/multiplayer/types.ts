export type RoomState = 'lobby' | 'countdown' | 'running' | 'ended';
export type PlayerRole = 'runner' | 'chaser';

export type PlayerFix = {
  lat: number;
  lng: number;
  speedMps: number | null;
  t: number;
};

export type Player = {
  uid: string;
  name: string;
  role: PlayerRole;
  online: boolean;
  score: number;
  joinedAt: number;
  lastFix: PlayerFix | null;
  lastStationId: string | null;
};

export type RoomConfig = {
  /** Seconds the runner gets alone on the network before chasers start scoring. */
  headStartSec: number;
  /** Capture radius in meters. Both players must also be at the same station. */
  captureRadiusM: number;
  /** Total round duration in minutes. */
  durationMin: number;
};

export type Room = {
  code: string;
  hostUid: string;
  createdAt: number;
  state: RoomState;
  mode: 'tag';
  config: RoomConfig;
  startedAt: number | null;
  endedAt: number | null;
  /** Current runner; rotates after a successful capture. */
  runnerUid: string | null;
};

export type RoomEvent =
  | {
      type: 'capture';
      capturerUid: string;
      capturedUid: string;
      stationId: string;
      at: number;
    }
  | { type: 'role-change'; uid: string; role: PlayerRole; at: number }
  | { type: 'cheat-flag'; uid: string; reason: string; at: number };

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  headStartSec: 5 * 60,
  captureRadiusM: 100,
  durationMin: 60,
};
