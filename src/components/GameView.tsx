import { useState } from 'react';
import { firebaseAuth } from '@/firebase';
import { useGameStore } from '@/stores/gameStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { Buzzer } from '@/components/Buzzer';
import { Scoreboard } from '@/components/Scoreboard';
import { shareJoinLink } from '@/utils/share';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const iconButton =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white';

const ListIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="8" y1="6" x2="20" y2="6" />
    <line x1="8" y1="12" x2="20" y2="12" />
    <line x1="8" y1="18" x2="20" y2="18" />
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const ExitIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

interface GameViewProps {
  // Lives in App so the header's back button and this exit icon share one modal.
  onLeave: () => void;
}

export const GameView = ({ onLeave }: GameViewProps) => {
  const { game, busy, error, start, advance, pause, resume, endGame } = useGameStore();
  const activeDevice = useDeviceStore(s => s.activeDevice());
  const [showScores, setShowScores] = useState(false);
  const [shared, setShared] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (!game) return null;

  const onShare = async () => {
    const result = await shareJoinLink(game.joinCode, game.name);
    if (result === 'failed') return;

    setShared(result === 'shared' ? 'Shared' : 'Link copied');
    setTimeout(() => setShared(null), 1500);
  };

  const isHost = game.ownerUserId === firebaseAuth.currentUser?.uid;
  const onRoster = game.players.some(p => p.userId === firebaseAuth.currentUser?.uid);
  const isRokuGame = game.target === 'roku';
  const answering = game.currentQuestion?.state === 'answering';
  const paused = game.pausedAt !== undefined;
  const active = game.status === 'active';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-white">{game.name}</h1>
          <p className="text-xs text-neutral-500">
            {paused ? 'paused' : game.status} · {game.players.length} playing
            {isRokuGame && activeDevice ? ` · ${activeDevice.name}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setShowScores(true)}
            aria-label="Leaderboard"
            className={iconButton}
          >
            <ListIcon />
          </button>
          <button type="button" onClick={onLeave} aria-label="Leave game" className={iconButton}>
            <ExitIcon />
          </button>
        </div>
      </div>

      {isHost && game.status === 'lobby' && (
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy || game.players.length < 2}
          className="rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          Start game &amp; cast
        </button>
      )}

      {/* The window closes on its own; this cuts it short. */}
      {isHost && active && !paused && answering && (
        <button
          type="button"
          onClick={() => void advance()}
          disabled={busy}
          className="rounded-lg border border-neutral-700 py-2 text-sm text-neutral-200 disabled:opacity-40"
        >
          Resume now
        </button>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {active && paused && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-10 text-center">
          <p className="text-4xl" aria-hidden>
            ⏸
          </p>
          <p className="text-2xl font-bold text-white">Paused</p>
          <p className="text-sm text-neutral-400">
            {isHost ? 'Buzzers are off until you resume.' : 'The host paused the game.'}
          </p>

          {isHost && (
            <button
              type="button"
              onClick={() => void resume()}
              disabled={busy}
              className="mt-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Resume game
            </button>
          )}
        </div>
      )}

      {active && !paused && onRoster && <Buzzer />}

      {active && !paused && !onRoster && (
        <p className="py-8 text-center text-sm text-neutral-500">
          {isHost ? 'You’re running the game' : 'You’re sitting out'}
        </p>
      )}

      {game.status === 'lobby' && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-6 text-center">
          <p className="text-xs text-neutral-500">Share this to let people in</p>
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-white">{game.joinCode}</p>

          <button
            type="button"
            onClick={() => void onShare()}
            className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
          >
            {shared ?? 'Share join link'}
          </button>

          <p className="text-sm text-neutral-500">Waiting to start…</p>

          {isHost && (
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              disabled={busy}
              className="text-xs text-neutral-500 underline hover:text-red-400 disabled:opacity-40"
            >
              End game
            </button>
          )}
        </div>
      )}

      {isHost && active && !paused && (
        <button
          type="button"
          onClick={() => void pause()}
          disabled={busy}
          className="rounded-lg border border-neutral-700 py-2 text-sm text-neutral-200 disabled:opacity-40"
        >
          Pause game
        </button>
      )}

      {showScores && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 p-4"
          onClick={() => setShowScores(false)}
        >
          <div className="w-full" onClick={e => e.stopPropagation()}>
            <Scoreboard game={game} />
            <button
              type="button"
              onClick={() => setShowScores(false)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2.5 text-sm text-neutral-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {confirmEnd && (
        <ConfirmDialog
          title="End this game?"
          message="Nobody will be able to join or play it again."
          confirmLabel="End game"
          cancelLabel="Keep it"
          onCancel={() => setConfirmEnd(false)}
          onConfirm={() => {
            setConfirmEnd(false);
            void endGame();
          }}
        />
      )}
    </div>
  );
};
