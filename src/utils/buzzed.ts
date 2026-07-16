import type { BuzzedGame, BuzzedPlayer } from '@/types/buzzed';

export interface BuzzedStanding {
  player: BuzzedPlayer;
  score: number;
  place: number; // 1-based, ties share a place (standard competition ranking: 1, 2, 2, 4)
  isTopThree: boolean; // place <= 3 — the confetti-and-medal tier
}

// Final standings, highest score first. Ties share a place, so the next place skips accordingly.
export const computeStandings = (game: BuzzedGame): BuzzedStanding[] => {
  const ranked = [...game.players].sort(
    (a, b) => (game.scores[b.userId] ?? 0) - (game.scores[a.userId] ?? 0)
  );

  let place = 0;
  let lastScore: number | null = null;

  return ranked.map((player, index) => {
    const score = game.scores[player.userId] ?? 0;
    if (score !== lastScore) {
      place = index + 1; // a new score claims its ordinal position; ties below keep the earlier place
      lastScore = score;
    }
    return { player, score, place, isTopThree: place <= 3 };
  });
};
