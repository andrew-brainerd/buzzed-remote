import { useEffect, useState } from 'react';
import { firebaseAuth } from '@/firebase';
import { useGameStore } from '@/stores/gameStore';
import type { BuzzedGame, BuzzedQuestion } from '@/types/buzzed';

const DEFAULT_COLOR = '#737373';

const rungIn = (question: BuzzedQuestion | null | undefined, userId: string) =>
  !!question?.ringIns.some(r => r.userId === userId);

// Mirrors the server's atomic buzz filter so the button is never lit when the server would reject it.
// `answering` is buzzable: latecomers join the queue behind the first ringer, they just score less.
const canBuzz = (game: BuzzedGame, userId: string, now: number) => {
  if (game.status !== 'active') return false;
  if (!game.players.some(p => p.userId === userId)) return false;

  const question = game.currentQuestion;
  if (!question) return false;
  if (question.state !== 'armed' && question.state !== 'answering') return false;
  if (question.answerCloseAt && now >= question.answerCloseAt) return false;
  if (rungIn(question, userId)) return false;

  return true;
};

// Archived questions you rang in on but haven't graded. These sit alongside a live buzzer — the next
// question is already armed while you're still marking the last one.
const pendingGrades = (game: BuzzedGame, userId: string) =>
  game.history.filter(q => q.ringIns.some(r => r.userId === userId && !r.grade));

export const Buzzer = () => {
  const { game, busy, buzz, grade } = useGameStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  if (!game) return null;

  const userId = firebaseAuth.currentUser?.uid ?? '';
  const question = game.currentQuestion;
  const me = game.players.find(p => p.userId === userId);

  const live = canBuzz(game, userId, now) && !busy;
  const answering = question?.state === 'answering';
  const secondsLeft =
    answering && question.answerCloseAt
      ? Math.max(0, Math.ceil((question.answerCloseAt - now) / 1000))
      : 0;

  const myPosition = question ? question.ringIns.findIndex(r => r.userId === userId) + 1 : 0;
  const toGrade = pendingGrades(game, userId);
  const color = me?.color ?? DEFAULT_COLOR;

  return (
    <div className="flex flex-col items-center gap-5 p-6">
      {answering && (
        <div className="w-full rounded-lg border border-brand-600/50 bg-brand-600/15 px-3 py-3 text-center">
          <p className="text-3xl font-bold tabular-nums text-white">{secondsLeft}</p>
          <p className="text-sm text-neutral-400">
            {myPosition > 0 ? `You rang in #${myPosition} — say it out loud` : 'Ring in to answer'}
          </p>
        </div>
      )}

      {question && question.ringIns.length > 0 && (
        <ol className="w-full space-y-1">
          {question.ringIns.map((ringIn, i) => {
            const player = game.players.find(p => p.userId === ringIn.userId);

            return (
              <li
                key={ringIn.userId}
                className="flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-1.5 text-sm"
              >
                <span className="w-4 text-neutral-500">{i + 1}</span>
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: player?.color ?? DEFAULT_COLOR }}
                />
                <span className="min-w-0 flex-1 truncate text-white">
                  {player?.displayName ?? 'Someone'}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <button
        type="button"
        disabled={!live}
        onClick={() => void buzz()}
        aria-label="Ring in"
        style={live ? { backgroundColor: color, boxShadow: '0 10px 0 0 #00000055' } : undefined}
        className={`flex aspect-square w-full max-w-[16rem] touch-manipulation items-center justify-center rounded-full text-3xl font-bold tracking-wider uppercase transition-transform select-none active:scale-95 ${
          live ? 'text-white' : 'cursor-not-allowed bg-neutral-800 text-neutral-600'
        }`}
      >
        Buzz
      </button>

      <p className="h-5 text-sm text-neutral-400">
        {live ? '' : myPosition > 0 ? 'You’re in the queue' : 'Waiting…'}
      </p>

      {toGrade.map(pendingQuestion => (
        <div
          key={pendingQuestion.index}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-4 text-center"
        >
          <p className="font-semibold text-white">Did you get it right?</p>
          <p className="mb-3 text-xs text-neutral-500">The answer is on screen now</p>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void grade(pendingQuestion.index, 'correct')}
              className="flex-1 rounded-lg bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
            >
              👍 Got it
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void grade(pendingQuestion.index, 'missed')}
              className="flex-1 rounded-lg border border-red-600 py-3 font-semibold text-red-400 disabled:opacity-50"
            >
              👎 Missed
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
