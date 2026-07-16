import { describe, expect, it } from 'vitest';
import { computeStandings } from '@/utils/buzzed';
import type { BuzzedGame, BuzzedPlayer } from '@/types/buzzed';

const player = (userId: string): BuzzedPlayer => ({ userId, displayName: userId });

const gameWith = (scores: Record<string, number>): BuzzedGame =>
  ({
    players: Object.keys(scores).map(player),
    scores
  }) as unknown as BuzzedGame;

describe('computeStandings', () => {
  it('orders by score, highest first', () => {
    const standings = computeStandings(gameWith({ a: 1, b: 5, c: 3 }));

    expect(standings.map(s => s.player.userId)).toEqual(['b', 'c', 'a']);
    expect(standings.map(s => s.place)).toEqual([1, 2, 3]);
  });

  it('shares a place on a tie and skips the next (1, 2, 2, 4)', () => {
    const standings = computeStandings(gameWith({ a: 10, b: 7, c: 7, d: 3 }));

    expect(standings.map(s => s.place)).toEqual([1, 2, 2, 4]);
  });

  it('flags the top three places for medals and confetti', () => {
    const standings = computeStandings(gameWith({ a: 5, b: 4, c: 3, d: 2, e: 1 }));

    expect(standings.map(s => s.isTopThree)).toEqual([true, true, true, false, false]);
  });

  it('counts a tie for third as top three even when it pushes a fourth player out', () => {
    const standings = computeStandings(gameWith({ a: 5, b: 4, c: 3, d: 3 }));

    // a=1, b=2, c=3, d=3 — both third-placers are in the medal tier.
    expect(standings.map(s => s.isTopThree)).toEqual([true, true, true, true]);
  });
});
