import { useEffect, useState } from 'react';
import * as api from '@/api/buzzedApi';
import { useGameStore } from '@/stores/gameStore';
import { DevicePicker } from '@/components/DevicePicker';
import type { BuzzedGame } from '@/types/buzzed';

const JOIN_CODE_LENGTH = 5;

export const JoinGame = () => {
  const { join, open, busy, error } = useGameStore();
  const [code, setCode] = useState('');
  const [games, setGames] = useState<BuzzedGame[]>([]);

  useEffect(() => {
    api
      .listGames()
      .then(all => setGames(all.filter(g => g.status !== 'completed')))
      .catch(() => setGames([]));
  }, []);

  return (
    <div className="space-y-4 p-4">
      <DevicePicker />

      <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
        <h2 className="text-sm font-medium text-neutral-300">Join a game</h2>
        <div className="flex gap-2">
          <input
            value={code}
            maxLength={JOIN_CODE_LENGTH}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-base tracking-widest text-white uppercase placeholder:tracking-normal placeholder:text-neutral-600 focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void join(code)}
            disabled={busy || code.trim().length < JOIN_CODE_LENGTH}
            className="rounded-md bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Join
          </button>
        </div>
      </div>

      {games.length > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60">
          <div className="border-b border-neutral-800 px-4 py-2">
            <h2 className="text-sm font-medium text-neutral-300">Your games</h2>
          </div>
          <ul>
            {games.map(game => (
              <li key={game.id}>
                <button
                  type="button"
                  onClick={() => void open(game.id)}
                  className="flex w-full items-center gap-3 border-b border-neutral-800/60 px-4 py-3 text-left last:border-b-0 hover:bg-neutral-800/40"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-white">{game.name}</span>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {game.status === 'lobby' ? game.joinCode : game.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
};
