import type { Zone } from '@/transit/types';

export type RoomState = 'lobby' | 'countdown' | 'running' | 'ended';
export type RoomMode = 'tag' | 'hide-seek' | 'race';
export type PlayerRole = 'runner' | 'chaser' | 'hider' | 'seeker' | 'racer';
export type Team = 'red' | 'blue';

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
  coins: number;
  joinedAt: number;
  lastFix: PlayerFix | null;
  lastStationId: string | null;
  team?: Team | null;
};

export type TagConfig = {
  /** Seconds the runner gets alone on the network before chasers start scoring. */
  headStartSec: number;
  /** Capture radius in meters. Both players must also be at the same station. */
  captureRadiusM: number;
  /** Total round duration in minutes. */
  durationMin: number;
};

export type HideSeekZone = Zone | 'all-mmr';

export type HideSeekConfig = {
  zone: HideSeekZone;
  /** Seekers' total time to find the hider. */
  durationMin: number;
  /** Seekers must reach this distance of the hider's station to win. */
  captureRadiusM: number;
  /** Coins each seeker starts with for buying hints. */
  startingCoins: number;
  /** Set once the hider arrives at and locks their hiding station. */
  hiderStationId: string | null;
  /** True once the hider locks in and the seekers are released. */
  hiderLocked: boolean;
};

type BaseRoom = {
  code: string;
  hostUid: string;
  createdAt: number;
  state: RoomState;
  startedAt: number | null;
  endedAt: number | null;
  /** Outcome: 'runner', 'chasers', 'hider', 'seekers' or null if undecided. */
  winner: string | null;
};

export type TagRoom = BaseRoom & {
  mode: 'tag';
  config: TagConfig;
  /** Current runner; rotates after a successful capture. */
  runnerUid: string | null;
};

export type HideSeekRoom = BaseRoom & {
  mode: 'hide-seek';
  config: HideSeekConfig;
  hiderUid: string | null;
};

export type RaceConfig = {
  fromStationId: string | null;
  toStationId: string | null;
  durationMin: number;
  /** How close (m) a racer must come to the destination to finish. */
  finishRadiusM: number;
  startingCoins: number;
};

export type RaceRoom = BaseRoom & {
  mode: 'race';
  config: RaceConfig;
};

export type Room = TagRoom | HideSeekRoom | RaceRoom;

export type CurseThrow = {
  id: string;
  fromUid: string;
  fromName: string;
  targetTeam: Team;
  cardId: string;
  cardTitle: string;
  cardDescription: string;
  cost: number;
  thrownAt: number;
  /** Wall-clock ms when the curse expires (0 = no timer). */
  expiresAt: number;
};

export type Question = {
  id: string;
  askerUid: string;
  askerName: string;
  text: string;
  answer: 'yes' | 'no' | 'unknown' | null;
  askedAt: number;
  answeredAt: number | null;
};

export type HintType =
  | 'zone'
  | 'line-type'
  | 'station-letter'
  | 'distance-from-station';

export type Hint = {
  id: string;
  askerUid: string;
  askerName: string;
  type: HintType;
  /** Optional input data for the hint (e.g., reference station id). */
  payload: Record<string, unknown> | null;
  result: string;
  costCoins: number;
  askedAt: number;
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
  | { type: 'cheat-flag'; uid: string; reason: string; at: number }
  | { type: 'hider-locked'; uid: string; stationId: string; at: number }
  | { type: 'hider-found'; finderUid: string; stationId: string; at: number }
  | {
      type: 'race-finish';
      uid: string;
      team: Team;
      stationId: string;
      at: number;
    }
  | {
      type: 'curse-throw';
      fromUid: string;
      targetTeam: Team;
      cardId: string;
      at: number;
    };

export const DEFAULT_TAG_CONFIG: TagConfig = {
  headStartSec: 5 * 60,
  captureRadiusM: 100,
  durationMin: 60,
};

export const DEFAULT_HIDE_SEEK_CONFIG: HideSeekConfig = {
  zone: 'all-mmr',
  durationMin: 60,
  captureRadiusM: 150,
  startingCoins: 50,
  hiderStationId: null,
  hiderLocked: false,
};

export const DEFAULT_RACE_CONFIG: RaceConfig = {
  fromStationId: null,
  toStationId: null,
  durationMin: 60,
  finishRadiusM: 150,
  startingCoins: 50,
};
