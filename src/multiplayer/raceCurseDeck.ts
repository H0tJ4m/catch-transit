/**
 * The deck of curses that racers can throw at the opposing team. Borrows from
 * the solo curse deck but with team-relevant copy and shorter durations to
 * keep race rounds fast.
 */
export type RaceCurse = {
  id: string;
  title: string;
  description: string;
  cost: number;
  durationSec: number;
};

export const RACE_CURSE_DECK: RaceCurse[] = [
  {
    id: 'rc-slow-local',
    title: 'Slow Local Only',
    description:
      'For the next 10 minutes the targeted team may not board any Fast train.',
    cost: 15,
    durationSec: 10 * 60,
  },
  {
    id: 'rc-detour',
    title: 'Mandatory Detour',
    description:
      'The targeted team must include at least one Metro segment in their route.',
    cost: 20,
    durationSec: 15 * 60,
  },
  {
    id: 'rc-skip-two',
    title: 'Skip Two',
    description: 'The targeted team must skip the next two stations without alighting.',
    cost: 10,
    durationSec: 0,
  },
  {
    id: 'rc-platform-ticket',
    title: 'Platform Ticket',
    description:
      'Targeted team must buy a platform ticket and remain on the platform for one full train arrival before continuing.',
    cost: 15,
    durationSec: 0,
  },
  {
    id: 'rc-ladies-side',
    title: 'Ladies First',
    description:
      'Targeted team must board on the side closer to the ladies compartment for the next 2 stations.',
    cost: 10,
    durationSec: 10 * 60,
  },
  {
    id: 'rc-no-csmt',
    title: 'No CSMT',
    description: 'CSMT is closed to the targeted team for 20 minutes.',
    cost: 25,
    durationSec: 20 * 60,
  },
];
