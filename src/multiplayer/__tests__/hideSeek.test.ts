import { detectHiderFound } from '../hideSeek';
import { resolveHint, eligibleHidingStations } from '../hideSeekHints';
import { getStation } from '@/transit/graph';
import type { HideSeekRoom, Player, Room } from '../types';

const room = (overrides: Partial<HideSeekRoom['config']> = {}): Room => ({
  code: 'H1',
  hostUid: 'h',
  createdAt: 0,
  state: 'running',
  startedAt: Date.now(),
  endedAt: null,
  winner: null,
  mode: 'hide-seek',
  hiderUid: 'h',
  config: {
    zone: 'all-mmr',
    durationMin: 30,
    captureRadiusM: 150,
    startingCoins: 50,
    hiderLocked: true,
    hiderStationId: 'wr-dadar',
    ...overrides,
  },
});

const seeker = (lat: number, lng: number): Player => ({
  uid: 'seeker',
  name: 'Seeker',
  role: 'seeker',
  online: true,
  score: 0,
  coins: 50,
  joinedAt: 0,
  lastFix: { lat, lng, speedMps: 0, t: Date.now() },
  lastStationId: null,
});

describe('hide & seek engine', () => {
  it('finds the hider when seeker is within capture radius of the locked station', () => {
    const dadar = getStation('wr-dadar')!;
    expect(detectHiderFound(room(), seeker(dadar.lat, dadar.lng))).toBe(true);
  });

  it('does not find the hider before they lock in', () => {
    expect(
      detectHiderFound(room({ hiderLocked: false }), seeker(19.0186, 72.8425)),
    ).toBe(false);
  });

  it('does not find the hider when seeker is far away', () => {
    expect(detectHiderFound(room(), seeker(19.4554, 72.8113))).toBe(false);
  });
});

describe('hide & seek hints', () => {
  it('reveals zone for a Dadar hider', () => {
    const dadar = getStation('wr-dadar')!;
    expect(resolveHint('zone', dadar)).toEqual({ ok: true, result: 'Zone: central-mumbai' });
  });

  it('reveals first letter', () => {
    const dadar = getStation('wr-dadar')!;
    expect(resolveHint('station-letter', dadar)).toEqual({
      ok: true,
      result: 'Starts with "D"',
    });
  });

  it('reports distance from a reference station', () => {
    const dadar = getStation('wr-dadar')!;
    const result = resolveHint('distance-from-station', dadar, 'wr-churchgate');
    expect(result.ok).toBe(true);
    expect(result.result).toMatch(/km from Churchgate/);
  });

  it('filters hiding stations by zone', () => {
    const south = eligibleHidingStations('south-mumbai');
    expect(south.every((s) => s.zone === 'south-mumbai')).toBe(true);
    expect(south.length).toBeGreaterThan(0);
  });
});
