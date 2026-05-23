import { create } from 'zustand';
import { drawCardForStation, pickDailyTargets, scoreFor } from './engine';
import type { ActiveCard, CardEvent, GameMode, Session } from './types';
import { stations } from '@/transit/graph';
import type { Station } from '@/transit/types';

const DAILY_CHALLENGE_TARGET_COUNT = 3;

type State = {
  session: Session | null;
  activeCard: ActiveCard | null;
};

type Actions = {
  startSession: (mode: GameMode) => void;
  endSession: () => void;
  onStationArrival: (station: Station) => void;
  resolveActiveCard: (result: 'success' | 'fail' | 'skip') => void;
  dismissCard: () => void;
};

export const useGame = create<State & Actions>((set, get) => ({
  session: null,
  activeCard: null,

  startSession: (mode) => {
    const id = `s-${Date.now()}`;
    const targets =
      mode === 'daily-challenge'
        ? pickDailyTargets(
            stations.map((s) => s.id),
            DAILY_CHALLENGE_TARGET_COUNT,
          )
        : undefined;
    set({
      session: {
        id,
        mode,
        startedAt: Date.now(),
        endedAt: null,
        score: 0,
        events: [],
        visitedStationIds: [],
        ...(targets ? { targets } : {}),
      },
      activeCard: null,
    });
  },

  endSession: () => {
    const { session } = get();
    if (!session) return;
    set({
      session: { ...session, endedAt: Date.now() },
      activeCard: null,
    });
  },

  onStationArrival: (station) => {
    const { session, activeCard } = get();
    if (!session || session.endedAt) return;
    if (activeCard) return; // don't stack cards
    if (session.visitedStationIds.includes(station.id)) return; // visited already

    const card = drawCardForStation(station);
    set({
      activeCard: card,
      session: {
        ...session,
        visitedStationIds: [...session.visitedStationIds, station.id],
      },
    });
  },

  resolveActiveCard: (result) => {
    const { session, activeCard } = get();
    if (!session || !activeCard) return;
    const delta = scoreFor(activeCard, result);
    const event: CardEvent = {
      cardId: activeCard.id,
      stationId: activeCard.stationId,
      result,
      scoreDelta: delta,
      at: Date.now(),
    };
    set({
      activeCard: null,
      session: {
        ...session,
        score: session.score + delta,
        events: [...session.events, event],
      },
    });
  },

  dismissCard: () => set({ activeCard: null }),
}));
