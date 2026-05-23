import {
  getStation,
  haversineMeters,
  nearestStation,
  neighbors,
  shortestPath,
} from '../graph';

describe('transit graph', () => {
  it('loads known stations', () => {
    expect(getStation('wr-dadar')).toBeDefined();
    expect(getStation('cr-csmt')?.name).toBe('Chhatrapati Shivaji Maharaj Terminus');
  });

  it('connects Dadar to its WR and CR neighbors', () => {
    const ns = neighbors('wr-dadar').map((n) => n.neighborId);
    expect(ns).toContain('wr-prabhadevi');
    expect(ns).toContain('wr-matunga-road');
    expect(ns).toContain('cr-parel');
    expect(ns).toContain('cr-matunga');
  });

  it('finds a path from Churchgate to CSMT via Dadar interchange', () => {
    const path = shortestPath('wr-churchgate', 'cr-csmt');
    expect(path).not.toBeNull();
    expect(path?.[0]).toBe('wr-churchgate');
    expect(path?.at(-1)).toBe('cr-csmt');
    expect(path?.length).toBeGreaterThan(2);
  });

  it('haversine returns 0 for the same point', () => {
    expect(haversineMeters({ lat: 19, lng: 72 }, { lat: 19, lng: 72 })).toBe(0);
  });

  it('finds the nearest station to a Dadar coordinate', () => {
    const found = nearestStation({ lat: 19.0186, lng: 72.8425 });
    expect(found?.station.id).toBe('wr-dadar');
    expect(found?.distance).toBeLessThan(50);
  });
});
