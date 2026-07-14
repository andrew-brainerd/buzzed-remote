import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { useGameStore } from '@/stores/gameStore';
import { Login } from '@/components/Login';
import { JoinGame } from '@/components/JoinGame';
import { HostGame } from '@/components/HostGame';
import { GameView } from '@/components/GameView';
import { LeaveConfirm } from '@/components/LeaveConfirm';

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
  const syncFromBackend = useDeviceStore(s => s.syncFromBackend);
  const [hosting, setHosting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

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

  // Only a subview has anywhere to go back TO — the games list is the root.
  const canGoBack = !!game || hosting;

  // Backing out of a game IS leaving it, so it asks first. Backing out of the create form isn't
  // destructive, so it just closes.
  const onBack = () => (game ? setConfirmLeave(true) : setHosting(false));

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
        <GameView onLeave={() => setConfirmLeave(true)} />
      ) : hosting ? (
        <HostGame />
      ) : (
        <JoinGame onHost={() => setHosting(true)} />
      )}

      {confirmLeave && game && (
        <LeaveConfirm
          joinCode={game.joinCode}
          onStay={() => setConfirmLeave(false)}
          onLeave={() => {
            setConfirmLeave(false);
            leave();
          }}
        />
      )}
    </div>
  );
};
