import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { useGameStore } from '@/stores/gameStore';
import { Login } from '@/components/Login';
import { JoinGame } from '@/components/JoinGame';
import { HostGame } from '@/components/HostGame';
import { GameView } from '@/components/GameView';

export const App = () => {
  const { user, ready, signOut } = useAuthStore();
  const game = useGameStore(s => s.game);
  const syncFromBackend = useDeviceStore(s => s.syncFromBackend);
  const [hosting, setHosting] = useState(false);

  // Pull the account's saved Rokos once we have a token to call with. The local cache renders first, so
  // this only ever fills in TVs added on another client.
  useEffect(() => {
    if (user) void syncFromBackend();
  }, [user, syncFromBackend]);

  // Creating the game drops you straight into it. Clear the flag now, or leaving that game later would
  // land you back on the create form instead of the games list.
  useEffect(() => {
    if (game) setHosting(false);
  }, [game]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-500">
        Loading…
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="min-h-screen touch-manipulation overscroll-none bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <span className="font-semibold">Buzzed</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-xs text-neutral-500 hover:text-white"
        >
          Sign out
        </button>
      </header>

      {game ? (
        <GameView />
      ) : hosting ? (
        <HostGame onCancel={() => setHosting(false)} />
      ) : (
        <JoinGame onHost={() => setHosting(true)} />
      )}
    </div>
  );
};
