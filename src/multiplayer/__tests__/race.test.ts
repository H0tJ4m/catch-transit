import { detectFinish, suggestTeam, teamCounts } from '../race';
import type { Player, RaceRoom } from '../types';
import { getStation } from '@/transit/graph';

const room = (overrides: Partial<RaceRoom['config']> = {}): RaceRoom => ({
  code: 'R1',
  hostUid: 'h',
  createdAt: 0,
  state: 'running',
  startedAt: Date.now(),
  endedAt: null,
  winner: null,
  mode: 'race',
  config: {
    fromStationId: 'wr-churchgate',
    toStationId: 'cr-thane',
    durationMin: 60,
    finishRadiusM: 150,
    startingCoins: 50,
    ...overrides,
  },
});

const racer = (lat: number, lng: number, team: 'red' | 'blue' = 'red'): Player => ({
  uid: 'r',
  name: 'r',
  role: 'racer',
  online: true,
  score: 0,
  coins: 0,
  joinedAt: 0,
  lastFix: { lat, lng, speedMps: 0, t: Date.now() },
  lastStationId: null,
  team,
});

describe('race engine', () => {
  it('detects finish when racer is at the destination station', () => {
    const thane = getStation('cr-thane')!;
    expect(detectFinish(room(), racer(thane.lat, thane.lng))).toBe(true);
  });

  it('does not finish when racer is far away', () => {
    expect(detectFinish(room(), racer(18.93, 72.83))).toBe(false);
  });

  it('does not finish when destination is not set yet', () => {
    const thane = getStation('cr-thane')!;
    expect(
      detectFinish(room({ toStationId: null }), racer(thane.lat, thane.lng)),
    ).toBe(false);
  });
});

describe('team balancing', () => {
  it('counts existing team members', () => {
    const players: Player[] = [racer(0, 0, 'red'), racer(0, 0, 'blue'), racer(0, 0, 'red')];
    expect(teamCounts(players)).toEqual({ red: 2, blue: 1 });
  });

  it('suggests the smaller team for a newcomer', () => {
    expect(suggestTeam([racer(0, 0, 'red'), racer(0, 0, 'red')])).toBe('blue');
    expect(suggestTeam([racer(0, 0, 'blue')])).toBe('red');
  });
});
