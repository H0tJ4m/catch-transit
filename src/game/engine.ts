import { challenges } from './decks/challenges';
import { curses } from './decks/curses';
import type { ActiveCard, Card } from './types';
import type { Station } from '@/transit/types';

const DECK: Card[] = [...challenges, ...curses];
const CURSE_PROBABILITY = 0.3;

export function drawCardForStation(station: Station, rng: () => number = Math.random): ActiveCard {
  const wantCurse = rng() < CURSE_PROBABILITY;
  const pool = DECK.filter((c) => {
    if (c.zones && !c.zones.includes(station.zone)) return false;
    return wantCurse ? c.kind === 'curse' : c.kind === 'challenge';
  });
  const fallback = DECK.filter((c) => !c.zones || c.zones.includes(station.zone));
  const finalPool = pool.length > 0 ? pool : fallback;
  const idx = Math.floor(rng() * finalPool.length);
  const card = finalPool[idx] ?? finalPool[0];
  if (!card) throw new Error('Empty deck — should not happen with seeded decks');

  const drawnAt = Date.now();
  return {
    ...card,
    drawnAt,
    stationId: station.id,
    expiresAt: card.timerSeconds > 0 ? drawnAt + card.timerSeconds * 1000 : null,
  };
}

export function scoreFor(card: ActiveCard, result: 'success' | 'fail' | 'skip'): number {
  if (result === 'success') return card.reward;
  if (result === 'fail') return -card.penalty;
  return -Math.floor(card.penalty / 2);
}

/** Pick N random target stations from the supplied list for the daily challenge. */
export function pickDailyTargets(allStationIds: string[], count: number, rng: () => number = Math.random): string[] {
  const pool = [...allStationIds];
  const out: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    const picked = pool.splice(idx, 1)[0];
    if (picked) out.push(picked);
  }
  return out;
}
