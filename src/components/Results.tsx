import { firebaseAuth } from '@/firebase';
import { computeStandings } from '@/utils/buzzed';
import { Confetti } from '@/components/Confetti';
import type { BuzzedGame } from '@/types/buzzed';

const DEFAULT_COLOR = '#737373';
const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const ORDINALS = ['1st', '2nd', '3rd'];
const ordinal = (place: number) => ORDINALS[place - 1] ?? `${place}th`;

interface ResultsProps {
  game: BuzzedGame;
  onDone: () => void;
}

export const Results = ({ game, onDone }: ResultsProps) => {
  const userId = firebaseAuth.currentUser?.uid;
  const standings = computeStandings(game);

  const mine = standings.find(s => s.player.userId === userId);
  // Everyone who placed top 3 gets a celebration — including the player looking at their own device.
  const celebrate = mine?.isTopThree ?? false;

  return (
    <div className="flex flex-col gap-4 p-4">
      {celebrate && <Confetti />}

      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Final results</p>
        <h1 className="truncate text-lg font-semibold text-white">{game.name}</h1>
      </div>

      {mine && (
        <div className="rounded-xl border border-brand-600/40 bg-brand-600/10 px-4 py-5 text-center">
          <p className="text-4xl" aria-hidden>
            {MEDALS[mine.place] ?? '🎯'}
          </p>
          <p className="mt-1 text-xl font-bold text-white">
            You finished {ordinal(mine.place)}
          </p>
          <p className="text-sm text-neutral-400">
            {mine.score} {mine.score === 1 ? 'point' : 'points'}
            {mine.isTopThree ? ' · nice ring-ins' : ''}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60">
        <div className="border-b border-neutral-800 px-4 py-2">
          <h2 className="text-sm font-medium text-neutral-300">Standings</h2>
        </div>
        <ul>
          {standings.map(({ player, score, place, isTopThree }) => (
            <li
              key={player.userId}
              className={`flex items-center gap-3 border-b border-neutral-800/60 px-4 py-2.5 last:border-b-0 ${
                player.userId === userId ? 'bg-brand-600/10' : ''
              }`}
            >
              <span className="w-6 shrink-0 text-center text-base">
                {isTopThree ? (
                  <span aria-label={ordinal(place)}>{MEDALS[place]}</span>
                ) : (
                  <span className="text-sm text-neutral-500">{place}</span>
                )}
              </span>
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: player.color ?? DEFAULT_COLOR }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-white">
                {player.displayName}
                {player.userId === userId && (
                  <span className="ml-1.5 text-xs text-neutral-500">(you)</span>
                )}
              </span>
              <span className="w-8 shrink-0 text-right text-lg font-semibold tabular-nums text-white">
                {score}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white"
      >
        Back to games
      </button>
    </div>
  );
};
