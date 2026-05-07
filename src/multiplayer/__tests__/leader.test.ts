import { electLeader } from '../leader';
import type { Player } from '../types';

const makePlayer = (uid: string, opts: Partial<Player> = {}): Player => ({
  uid,
  name: uid,
  role: 'racer',
  online: true,
  score: 0,
  coins: 0,
  joinedAt: 0,
  lastFix: null,
  lastStationId: null,
  ...opts,
});

describe('leader election', () => {
  it('returns the lexicographically smallest online uid', () => {
    const players = [makePlayer('zoo'), makePlayer('alpha'), makePlayer('mid')];
    expect(electLeader(players)).toBe('alpha');
  });

  it('skips offline players', () => {
    const players = [
      makePlayer('alpha', { online: false }),
      makePlayer('beta'),
    ];
    expect(electLeader(players)).toBe('beta');
  });

  it('treats a player with a stale GPS fix as offline', () => {
    const now = 1_000_000;
    const players = [
      makePlayer('alpha', {
        lastFix: { lat: 0, lng: 0, speedMps: null, t: now - 60_000 },
      }),
      makePlayer('beta', {
        lastFix: { lat: 0, lng: 0, speedMps: null, t: now - 5_000 },
      }),
    ];
    expect(electLeader(players, now)).toBe('beta');
  });

  it('returns null when nobody is eligible', () => {
    expect(electLeader([])).toBeNull();
    expect(electLeader([makePlayer('a', { online: false })])).toBeNull();
  });
});
