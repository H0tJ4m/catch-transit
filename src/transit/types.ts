export type Zone =
  | 'south-mumbai'
  | 'central-mumbai'
  | 'western-suburbs'
  | 'eastern-suburbs'
  | 'mira-bhayandar'
  | 'vasai-virar'
  | 'thane'
  | 'navi-mumbai';

export type LineType = 'suburban' | 'metro' | 'monorail';

export type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  zone: Zone;
};

export type Line = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  type: LineType;
  stations: string[];
};

export type Adjacency = Record<
  string,
  Array<{ neighborId: string; lineId: string; travelMinutes: number }>
>;
