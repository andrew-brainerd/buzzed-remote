import { firebaseAuth } from '@/firebase';
import { useGameStore } from '@/stores/gameStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { Buzzer } from '@/components/Buzzer';
import { Scoreboard } from '@/components/Scoreboard';

export const GameView = () => {
  const { game, busy, error, cast, start, advance, leave } = useGameStore();
  const activeDevice = useDeviceStore(s => s.activeDevice());

  if (!game) return null;

  const isHost = game.ownerUserId === firebaseAuth.currentUser?.uid;
  const onRoster = game.players.some(p => p.userId === firebaseAuth.currentUser?.uid);
  const isRokuGame = game.target === 'roku';
  const answering = game.currentQuestion?.state === 'answering';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">{game.name}</h1>
          <p className="text-xs text-neutral-500">
            {game.status} · {game.players.length} playing
            {isRokuGame && activeDevice ? ` · ${activeDevice.name}` : ''}
          </p>
        </div>
        <button type="button" onClick={leave} className="text-xs text-neutral-400 hover:text-white">
          Leave
        </button>
      </div>

      {/* Only the host's app drives the TV, so only the host gets these. */}
      {isHost && isRokuGame && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void cast()}
            disabled={busy || !game.videoId || !activeDevice}
            className="flex-1 rounded-lg border border-neutral-700 py-2 text-sm text-neutral-200 disabled:opacity-40"
          >
            Cast to TV
          </button>
          {game.status === 'lobby' && (
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy || game.players.length < 2}
              className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Start game
            </button>
          )}
        </div>
      )}

      {/* The window closes on its own; this just cuts it short once everyone has answered. */}
      {isHost && answering && (
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

      {game.status === 'active' && onRoster && <Buzzer />}

      {game.status === 'active' && !onRoster && (
        <p className="py-8 text-center text-sm text-neutral-500">
          {isHost ? 'You’re running the game' : 'You’re sitting out'}
        </p>
      )}

      {game.status === 'lobby' && (
        <p className="py-8 text-center text-sm text-neutral-500">
          Waiting to start · code <span className="font-mono text-white">{game.joinCode}</span>
        </p>
      )}

      <Scoreboard game={game} />
    </div>
  );
};
