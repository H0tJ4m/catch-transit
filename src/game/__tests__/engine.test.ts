import { drawCardForStation, pickDailyTargets, scoreFor } from '../engine';
import type { Station } from '@/transit/types';

const dadar: Station = {
  id: 'wr-dadar',
  name: 'Dadar',
  lat: 19.0186,
  lng: 72.8425,
  lines: ['wr', 'cr-main', 'metro-3'],
  zone: 'central-mumbai',
};

function seededRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

describe('game engine', () => {
  it('draws a curse when the random roll is below the curse threshold', () => {
    const card = drawCardForStation(dadar, seededRng([0.1, 0]));
    expect(card.kind).toBe('curse');
  });

  it('draws a challenge when the random roll is above the curse threshold', () => {
    const card = drawCardForStation(dadar, seededRng([0.9, 0]));
    expect(card.kind).toBe('challenge');
  });

  it('honors zone-restricted cards only in the right zone', () => {
    for (let i = 0; i < 50; i++) {
      const card = drawCardForStation(dadar);
      if (card.zones) expect(card.zones).toContain('central-mumbai');
    }
  });

  it('scores success/fail/skip relative to reward and penalty', () => {
    const card = drawCardForStation(dadar, seededRng([0.9, 0]));
    expect(scoreFor(card, 'success')).toBe(card.reward);
    expect(scoreFor(card, 'fail')).toBe(-card.penalty);
    expect(scoreFor(card, 'skip')).toBe(-Math.floor(card.penalty / 2));
  });

  it('picks the requested number of unique daily targets', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const picked = pickDailyTargets(ids, 3);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
  });
});
