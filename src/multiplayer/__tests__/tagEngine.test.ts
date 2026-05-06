import {
  detectCapture,
  headStartRemainingSec,
  isAdjacentStation,
  runnerScoreForInterval,
  timeRemainingSec,
} from '../tagEngine';
import type { Player, Room } from '../types';

const baseRoom: Room = {
  code: 'TEST',
  hostUid: 'h',
  createdAt: 0,
  state: 'running',
  mode: 'tag',
  config: { headStartSec: 60, captureRadiusM: 100, durationMin: 5 },
  startedAt: Date.now(),
  endedAt: null,
  winner: null,
  runnerUid: 'runner',
};

const playerAtDadar = (uid: string, dx = 0, dy = 0): Player => ({
  uid,
  name: uid,
  role: 'runner',
  online: true,
  score: 0,
  coins: 0,
  joinedAt: 0,
  lastFix: { lat: 19.0186 + dy, lng: 72.8425 + dx, speedMps: 0, t: Date.now() },
  lastStationId: 'wr-dadar',
});

describe('tag engine', () => {
  it('reports head-start time remaining as positive immediately after start', () => {
    expect(headStartRemainingSec(baseRoom)).toBeGreaterThan(0);
  });

  it('reports total time remaining as positive immediately after start', () => {
    expect(timeRemainingSec(baseRoom)).toBeGreaterThan(0);
  });

  it('detects a capture when both players are at the same station and within radius', () => {
    const runner = playerAtDadar('runner');
    const chaser = playerAtDadar('chaser');
    expect(detectCapture(runner, chaser, 100)).toBe(true);
  });

  it('does not capture when players are at different stations', () => {
    const runner = playerAtDadar('runner');
    const chaser = { ...playerAtDadar('chaser'), lastStationId: 'wr-bandra' };
    expect(detectCapture(runner, chaser, 100)).toBe(false);
  });

  it('does not capture beyond the radius even at the same station', () => {
    const runner = playerAtDadar('runner');
    const chaser = playerAtDadar('chaser', 0.01, 0.01); // ~1.5 km away
    expect(detectCapture(runner, chaser, 100)).toBe(false);
  });

  it('awards roughly RUNNER_TICK_POINTS per minute', () => {
    expect(runnerScoreForInterval(0, 60_000)).toBe(10);
    expect(runnerScoreForInterval(0, 5 * 60_000)).toBe(50);
  });

  it('recognizes a real station adjacency', () => {
    expect(isAdjacentStation('wr-dadar', 'wr-prabhadevi')).toBe(true);
    expect(isAdjacentStation('wr-dadar', 'wr-virar')).toBe(false);
  });
});
