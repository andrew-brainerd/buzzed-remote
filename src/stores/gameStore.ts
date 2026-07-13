import { create } from 'zustand';
import Pusher, { type Channel } from 'pusher-js';
import { firebaseAuth } from '@/firebase';
import * as api from '@/api/buzzedApi';
import { useDeviceStore } from '@/stores/deviceStore';
import { castVideo, setRokuPlaying } from '@/utils/rokuControl';
import type { BuzzedGame, BuzzedGrade } from '@/types/buzzed';

const CHANNEL = (gameId: string) => `buzzed-game-${gameId}`;
const GAME_UPDATED = 'buzzedGameUpdated';
const RANG_IN = 'buzzedRangIn';
const WINDOW_CLOSED = 'buzzedWindowClosed';
const GRADED = 'buzzedGraded';
const PLAYBACK_UPDATED = 'buzzedPlaybackUpdated';

// Same reasoning as the web client: a missed Pusher event is silent, so realtime is the fast path and
// these reconcile it. Without them one dropped socket leaves the app stale forever with no signal.
const RECONCILE_MS = 10_000;

interface GameState {
  game: BuzzedGame | null;
  error: string | null;
  busy: boolean;
  join: (code: string) => Promise<void>;
  open: (gameId: string) => Promise<void>;
  leave: () => void;
  refetch: () => Promise<void>;
  buzz: () => Promise<void>;
  grade: (questionIndex: number, grade: BuzzedGrade) => Promise<void>;
  advance: () => Promise<void>;
  cast: () => Promise<void>;
  start: () => Promise<void>;
}

let pusher: Pusher | null = null;
let channel: Channel | null = null;
let reconcileTimer: ReturnType<typeof setInterval> | null = null;
let advanceTimer: ReturnType<typeof setTimeout> | null = null;

// Refetch responses can land out of order — one issued before a ring-in can return after it and wipe the
// queue. Stamp every request and drop any response a newer one has already superseded.
let seq = 0;
let applied = 0;

const getPusher = () => {
  if (!pusher) {
    pusher = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY ?? '', { cluster: 'us2' });
  }
  return pusher;
};

export const useGameStore = create<GameState>((set, get) => {
  // Only the host's app drives the TV. Every other client — app or web — is a pure buzzer, so exactly
  // one client ever sends a keypress. That matters because ECP `Play` is a toggle (see rokuControl).
  const isHost = (game: BuzzedGame | null) =>
    !!game && !!firebaseAuth.currentUser && game.ownerUserId === firebaseAuth.currentUser.uid;

  const rokuIp = (game: BuzzedGame | null) =>
    game?.rokuDeviceIp || useDeviceStore.getState().activeDevice()?.ip;

  const clearAdvance = () => {
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = null;
  };

  // Drive the TV to match the game, and close the answering window once it runs out. In a Roku game this
  // app is the host's only screen, so the countdown the web host would run lives here instead. /advance is
  // idempotent, so firing it late — or alongside another client — is harmless.
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
      // Swallow: a failed reconcile just means we try again on the next tick.
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
      // Must go through the Pusher instance — `channel.unsubscribe()` leaves the subscription
      // pending-but-uncancelled and the client silently deaf.
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

    leave: () => {
      unsubscribe();
      set({ game: null, error: null });
    },

    refetch,

    buzz: async () => {
      const game = get().game;
      const question = game?.currentQuestion;
      if (!game || !question) return;

      // Act on our own response, not the fan-out — we learn our place in the queue first.
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

    cast: async () => {
      const game = get().game;
      const ip = rokuIp(game);
      if (!game?.videoId || !ip) {
        set({ error: 'Set a video and a Roku first' });
        return;
      }
      await run(async () => {
        await castVideo(ip, game.videoId!);
      });
    },

    start: async () => {
      const game = get().game;
      if (!game) return;
      await run(() => api.startGame(game.id));
    }
  };
});
