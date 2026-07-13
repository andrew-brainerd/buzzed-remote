import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { Login } from '@/components/Login';
import { JoinGame } from '@/components/JoinGame';
import { GameView } from '@/components/GameView';

export const App = () => {
  const { user, ready, signOut } = useAuthStore();
  const game = useGameStore(s => s.game);

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

      {game ? <GameView /> : <JoinGame />}
    </div>
  );
};
