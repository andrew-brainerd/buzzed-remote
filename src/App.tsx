import { useEffect, useState } from 'react';
import { firebaseAuth } from '@/firebase';
import { useAuthStore } from '@/stores/authStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { useGameStore } from '@/stores/gameStore';
import { Login } from '@/components/Login';
import { JoinGame } from '@/components/JoinGame';
import { HostGame } from '@/components/HostGame';
import { GameView } from '@/components/GameView';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const BackIcon = () => (
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
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const App = () => {
  const { user, ready, signOut } = useAuthStore();
  const game = useGameStore(s => s.game);
  const leave = useGameStore(s => s.leave);
  const closeGame = useGameStore(s => s.close);
  const syncFromBackend = useDeviceStore(s => s.syncFromBackend);
  const [hosting, setHosting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (user) void syncFromBackend();
  }, [user, syncFromBackend]);

  // Otherwise leaving the game later lands on the create form instead of the games list.
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

  const canGoBack = !!game || hosting;
  const isHost = !!game && game.ownerUserId === firebaseAuth.currentUser?.uid;

  // The host owns the game — backing out just closes the view and it stays in their list, so there's
  // nothing to confirm. For anyone else it's a real leave.
  const onExitGame = () => {
    // A finished game is over for everyone — just go back to the list, don't drop it or prompt.
    if (game?.status === 'completed') {
      closeGame();
      return;
    }
    if (isHost) {
      void leave();
      return;
    }
    setConfirmLeave(true);
  };

  const onBack = () => (game ? onExitGame() : setHosting(false));

  return (
    <div className="min-h-screen touch-manipulation overscroll-none bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex min-w-0 items-center gap-1">
          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="-ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white"
            >
              <BackIcon />
            </button>
          )}
          <span className="font-semibold">Buzzed</span>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="shrink-0 text-xs text-neutral-500 hover:text-white"
        >
          Sign out
        </button>
      </header>

      {game ? (
        <GameView onLeave={onExitGame} />
      ) : hosting ? (
        <HostGame />
      ) : (
        <JoinGame onHost={() => setHosting(true)} />
      )}

      {confirmLeave && game && (
        <ConfirmDialog
          title="Leave this game?"
          message={
            <>
              It’ll drop off your games. You can rejoin with the code{' '}
              <span className="font-mono text-white">{game.joinCode}</span>.
            </>
          }
          confirmLabel="Leave"
          cancelLabel="Stay"
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() => {
            setConfirmLeave(false);
            void leave();
          }}
        />
      )}
    </div>
  );
};
