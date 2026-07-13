import { firebaseAuth } from '@/firebase';
import type { BuzzedGame } from '@/types/buzzed';

const DEFAULT_COLOR = '#737373';

interface ScoreboardProps {
  game: BuzzedGame;
}

export const Scoreboard = ({ game }: ScoreboardProps) => {
  const userId = firebaseAuth.currentUser?.uid;
  const rungIn = new Set(game.currentQuestion?.ringIns.map(r => r.userId));

  const standings = [...game.players].sort(
    (a, b) => (game.scores[b.userId] ?? 0) - (game.scores[a.userId] ?? 0)
  );

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60">
      <div className="border-b border-neutral-800 px-4 py-2">
        <h2 className="text-sm font-medium text-neutral-300">Scoreboard</h2>
      </div>
      <ul>
        {standings.map((player, i) => (
          <li
            key={player.userId}
            className={`flex items-center gap-3 border-b border-neutral-800/60 px-4 py-2.5 last:border-b-0 ${
              rungIn.has(player.userId) ? 'bg-brand-600/20' : ''
            }`}
          >
            <span className="w-5 shrink-0 text-sm text-neutral-500">{i + 1}</span>
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: player.color ?? DEFAULT_COLOR }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-white">
              {player.displayName}
              {player.userId === userId && <span className="ml-1.5 text-xs text-neutral-500">(you)</span>}
            </span>
            <span className="w-8 shrink-0 text-right text-lg font-semibold tabular-nums text-white">
              {game.scores[player.userId] ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
