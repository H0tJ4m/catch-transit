export type CardKind = 'challenge' | 'curse';

export type CardResolutionMode =
  | 'self-report'
  | 'photo'
  | 'station-arrival'
  | 'timer';

export type Card = {
  id: string;
  kind: CardKind;
  title: string;
  description: string;
  /** Points awarded on success. Curses penalize on failure rather than reward. */
  reward: number;
  /** Penalty for failing or skipping. */
  penalty: number;
  /** How long the player has to resolve the card (seconds). 0 = no timer. */
  timerSeconds: number;
  resolution: CardResolutionMode;
  /** Optional zone restriction — card only draws in matching zones. */
  zones?: string[];
};

export type ActiveCard = Card & {
  drawnAt: number;
  stationId: string;
  expiresAt: number | null;
};

export type CardEvent = {
  cardId: string;
  stationId: string;
  result: 'success' | 'fail' | 'skip';
  scoreDelta: number;
  at: number;
};

export type GameMode = 'free-roam' | 'daily-challenge';

export type Session = {
  id: string;
  mode: GameMode;
  startedAt: number;
  endedAt: number | null;
  score: number;
  events: CardEvent[];
  visitedStationIds: string[];
  /** Daily-challenge only: ordered targets the player must reach. */
  targets?: string[];
};
