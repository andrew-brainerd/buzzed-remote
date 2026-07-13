import { invoke } from '@tauri-apps/api/core';
import { firebaseAuth } from '@/firebase';
import { useConfigStore } from '@/stores/configStore';
import type { BuzzResponse, BuzzedGame, BuzzedGrade } from '@/types/buzzed';

// Every call goes through the Rust proxy rather than fetch() from the webview. That sidesteps CORS
// entirely and lets debug builds accept the local self-signed cert. The proxy attaches the Firebase ID
// token as a bearer plus an `X-Client` marker; brainerd-api's firebaseAuthMiddleware falls back to
// verifyIdToken when the bearer isn't a session cookie, which is how a native client authenticates.
const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('Not signed in');

  const token = await user.getIdToken();
  const base = useConfigStore.getState().apiBase;

  return invoke<T>('brainerd_api', { method, path, token, body: body ?? null, base });
};

export const getGame = (gameId: string) => call<BuzzedGame>('GET', `/buzzed/games/${gameId}`);

export const listGames = () =>
  call<{ games: BuzzedGame[] }>('GET', '/buzzed/games').then(r => r.games ?? []);

export const joinByCode = (code: string, color?: string) =>
  call<BuzzedGame>('POST', '/buzzed/games/join-by-code', { code, color });

export const buzz = (gameId: string, questionIndex: number) =>
  call<BuzzResponse>('POST', `/buzzed/games/${gameId}/buzz`, { questionIndex });

// Closes the answering window early and arms the next question. Idempotent server-side, so the host's
// "resume now" and the client that notices the window elapsed can both fire it without racing.
export const advance = (gameId: string) =>
  call<BuzzedGame>('POST', `/buzzed/games/${gameId}/advance`, {});

export const grade = (gameId: string, questionIndex: number, grade: BuzzedGrade) =>
  call<BuzzedGame>('POST', `/buzzed/games/${gameId}/grade`, { questionIndex, grade });

export const setPlayback = (gameId: string, playing: boolean, positionSec: number) =>
  call<BuzzedGame>('PUT', `/buzzed/games/${gameId}/playback`, { playing, positionSec });

export const setVideo = (gameId: string, videoId: string) =>
  call<BuzzedGame>('PUT', `/buzzed/games/${gameId}/video`, { videoId });

export const startGame = (gameId: string) =>
  call<BuzzedGame>('POST', `/buzzed/games/${gameId}/start`, {});

export const serverNow = () => call<{ now: number }>('GET', '/buzzed/time').then(r => r.now);
