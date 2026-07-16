import { create } from 'zustand';
import Pusher, { type Channel } from 'pusher-js';
import { firebaseAuth } from '@/firebase';
import * as api from '@/api/buzzedApi';
import { useDeviceStore } from '@/stores/deviceStore';
import { castVideo, ensureRokuOn, setRokuPlaying } from '@/utils/rokuControl';
import type { BuzzedGame, BuzzedGrade } from '@/types/buzzed';

const CHANNEL = (gameId: string) => `buzzed-game-${gameId}`;
const GAME_UPDATED = 'buzzedGameUpdated';
const RANG_IN = 'buzzedRangIn';
const WINDOW_CLOSED = 'buzzedWindowClosed';
const GRADED = 'buzzedGraded';
const PLAYBACK_UPDATED = 'buzzedPlaybackUpdated';

// A missed Pusher event is silent, so realtime is the fast path and these reconcile it.
const RECONCILE_MS = 10_000;

interface GameState {
  game: BuzzedGame | null;
  error: string | null;
  busy: boolean;
  join: (code: string) => Promise<void>;
  open: (gameId: string) => Promise<void>;
  host: (input: HostGameInput) => Promise<void>;
  leave: () => Promise<void>;
  close: () => void;
  refetch: () => Promise<void>;
  buzz: () => Promise<void>;
  grade: (questionIndex: number, grade: BuzzedGrade) => Promise<void>;
  advance: () => Promise<void>;
  start: () => Promise<void>;
  endGame: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
}

export interface HostGameInput {
  name: string;
  videoId: string;
  answerWindowMs: number;
  hostPlaying: boolean;
}

let pusher: Pusher | null = null;
let channel: Channel | null = null;
let reconcileTimer: ReturnType<typeof setInterval> | null = null;
let advanceTimer: ReturnType<typeof setTimeout> | null = null;

// Refetches can land out of order: stamp each one and drop any response a newer one has superseded.
let seq = 0;
let applied = 0;

const getPusher = () => {
  if (!pusher) {
    pusher = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY ?? '', { cluster: 'us2' });
  }
  return pusher;
};

export const useGameStore = create<GameState>((set, get) => {
  // Only the host's app drives the TV, so exactly one client ever sends a keypress — ECP `Play` is a
  // toggle (see rokuControl).
  const isHost = (game: BuzzedGame | null) =>
    !!game && !!firebaseAuth.currentUser && game.ownerUserId === firebaseAuth.currentUser.uid;

  const rokuIp = (game: BuzzedGame | null) =>
    game?.rokuDeviceIp || useDeviceStore.getState().activeDevice()?.ip;

  const clearAdvance = () => {
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = null;
  };

  // In a Roku game this app is the host's only screen, so the window countdown lives here. /advance is
  // idempotent, so firing it late or alongside another client is harmless.
  const syncTv = async (game: BuzzedGame) => {
    if (!isHost(game) || game.status !== 'active') return;

    clearAdvance();

    const question = game.currentQuestion;
    if (question?.state === 'answering' && question.answerCloseAt) {
      const delay = Math.max(0, question.answerCloseAt - Date.now());
      advanceTimer = setTimeout(() => {
        void api
          .advance(game.id)
          .then(apply)
          .catch(() => undefined);
      }, delay);
    }

    if (game.target !== 'roku') return;

    const ip = rokuIp(game);
    if (!ip) return;

    await setRokuPlaying(ip, game.playback.playing).catch(() => undefined);
  };

  const apply = (game: BuzzedGame) => {
    set({ game });
    void syncTv(game);
  };

  const refetch = async () => {
    const current = get().game;
    if (!current) return;

    const mine = ++seq;
    try {
      const fresh = await api.getGame(current.id);
      if (mine <= applied) return;
      applied = mine;
      apply(fresh);
    } catch {
      // A failed reconcile just retries on the next tick.
    }
  };

  const subscribe = (gameId: string) => {
    channel = getPusher().subscribe(CHANNEL(gameId));
    [GAME_UPDATED, RANG_IN, WINDOW_CLOSED, GRADED, PLAYBACK_UPDATED].forEach(event =>
      channel?.bind(event, () => void refetch())
    );
    reconcileTimer = setInterval(() => void refetch(), RECONCILE_MS);
  };

  const unsubscribe = () => {
    if (channel) {
      channel.unbind_all();
      // `channel.unsubscribe()` leaves a pending subscription uncancelled and the client silently deaf.
      getPusher().unsubscribe(channel.name);
      channel = null;
    }
    if (reconcileTimer) clearInterval(reconcileTimer);
    reconcileTimer = null;
    clearAdvance();
  };

  const run = async (fn: () => Promise<BuzzedGame | void>) => {
    set({ busy: true, error: null });
    try {
      const fresh = await fn();
      if (fresh) apply(fresh);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ busy: false });
    }
  };

  return {
    game: null,
    error: null,
    busy: false,

    join: async code =>
      run(async () => {
        const game = await api.joinByCode(code.trim().toUpperCase());
        unsubscribe();
        subscribe(game.id);
        return game;
      }),

    open: async gameId =>
      run(async () => {
        const game = await api.getGame(gameId);
        unsubscribe();
        subscribe(game.id);
        return game;
      }),

    // The active Roku is baked into the game at creation, so every client knows which TV it's on.
    host: async input =>
      run(async () => {
        const ip = rokuIp(null);
        if (!ip) throw new Error('Pick a Roku first');

        const game = await api.createGame({
          name: input.name,
          target: 'roku',
          rokuDeviceIp: ip,
          videoId: input.videoId,
          settings: { answerWindowMs: input.answerWindowMs },
          hostPlaying: input.hostPlaying
        });

        unsubscribe();
        subscribe(game.id);
        return game;
      }),

    // The host owns the game, so backing out just closes the view — it stays in their list. Anyone else
    // is dropped from participantUserIds, which is what the games list is queried by.
    leave: async () => {
      const game = get().game;

      if (game && !isHost(game)) {
        await api.leaveGame(game.id).catch(() => undefined);
      }

      unsubscribe();
      set({ game: null, error: null });
    },

    refetch,

    buzz: async () => {
      const game = get().game;
      const question = game?.currentQuestion;
      if (!game || !question) return;

      await run(async () => (await api.buzz(game.id, question.index)).game);
    },

    grade: async (questionIndex, grade) => {
      const game = get().game;
      if (!game) return;
      await run(() => api.grade(game.id, questionIndex, grade));
    },

    advance: async () => {
      const game = get().game;
      if (!game) return;
      await run(() => api.advance(game.id));
    },

    // Starting is the cast: the TV goes up first, so the intro is playing before the buzzers go live.
    start: async () => {
      const game = get().game;
      if (!game) return;

      const ip = rokuIp(game);
      if (game.target === 'roku' && (!game.videoId || !ip)) {
        set({ error: 'Set a video and a Roku first' });
        return;
      }

      await run(async () => {
        if (game.target === 'roku' && ip && game.videoId) {
          const awake = await ensureRokuOn(ip);
          if (!awake) throw new Error('The TV didn’t wake up. Turn it on and try again.');

          await castVideo(ip, game.videoId);
        }
        return api.startGame(game.id);
      });
    },

    endGame: async () => {
      const game = get().game;
      if (!game) return;

      // Keep the completed game on screen — everyone lands on the results/standings. The video is done,
      // so drop realtime; `run` applies the returned `completed` game, which GameView branches on.
      await run(() => api.completeGame(game.id));

      if (!get().error) unsubscribe();
    },

    // The game's over — just leave the results view for the games list. No API call: a completed game
    // shouldn't drop off anyone's history the way an active-game `leave` does.
    close: () => {
      unsubscribe();
      set({ game: null, error: null });
    },

    pause: async () => {
      const game = get().game;
      if (!game) return;
      await run(() => api.pauseGame(game.id));
    },

    resume: async () => {
      const game = get().game;
      if (!game) return;
      await run(() => api.resumeGame(game.id));
    }
  };
});
