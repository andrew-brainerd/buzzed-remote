import { firebaseAuth } from '@/firebase';
import { useGameStore } from '@/stores/gameStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { Buzzer } from '@/components/Buzzer';
import { Scoreboard } from '@/components/Scoreboard';

export const GameView = () => {
  const { game, busy, error, start, advance, pause, resume, leave } = useGameStore();
  const activeDevice = useDeviceStore(s => s.activeDevice());

  if (!game) return null;

  const isHost = game.ownerUserId === firebaseAuth.currentUser?.uid;
  const onRoster = game.players.some(p => p.userId === firebaseAuth.currentUser?.uid);
  const isRokuGame = game.target === 'roku';
  const answering = game.currentQuestion?.state === 'answering';
  const paused = game.pausedAt !== undefined;
  const active = game.status === 'active';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-white">{game.name}</h1>
          <p className="text-xs text-neutral-500">
            {paused ? 'paused' : game.status} · {game.players.length} playing
            {isRokuGame && activeDevice ? ` · ${activeDevice.name}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={leave}
          className="shrink-0 text-xs text-neutral-400 hover:text-white"
        >
          Leave
        </button>
      </div>

      {/* Starting IS the cast — there's no separate "cast to TV" button to get out of step with it. */}
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

      {/* The window closes on its own; this just cuts it short once everyone has answered. */}
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
        <p className="py-8 text-center text-sm text-neutral-500">
          Waiting to start · code <span className="font-mono text-white">{game.joinCode}</span>
        </p>
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

      <Scoreboard game={game} />
    </div>
  );
};
