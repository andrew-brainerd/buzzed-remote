import { call } from '@/api/client';
import type { BuzzResponse, BuzzedGame, BuzzedGrade, CreateBuzzedGameInput } from '@/types/buzzed';

export const getGame = (gameId: string) => call<BuzzedGame>('GET', `/buzzed/games/${gameId}`);

export const listGames = () =>
  call<{ games: BuzzedGame[] }>('GET', '/buzzed/games').then(r => r.games ?? []);

export const joinByCode = (code: string, color?: string) =>
  call<BuzzedGame>('POST', '/buzzed/games/join-by-code', { code, color });

export const buzz = (gameId: string, questionIndex: number) =>
  call<BuzzResponse>('POST', `/buzzed/games/${gameId}/buzz`, { questionIndex });

// Idempotent, so the host's "resume now" and the client that notices the window elapse can both fire it.
export const advance = (gameId: string) =>
  call<BuzzedGame>('POST', `/buzzed/games/${gameId}/advance`, {});

export const grade = (gameId: string, questionIndex: number, grade: BuzzedGrade) =>
  call<BuzzedGame>('POST', `/buzzed/games/${gameId}/grade`, { questionIndex, grade });

export const setPlayback = (gameId: string, playing: boolean, positionSec: number) =>
  call<BuzzedGame>('PUT', `/buzzed/games/${gameId}/playback`, { playing, positionSec });

export const setVideo = (gameId: string, videoId: string) =>
  call<BuzzedGame>('PUT', `/buzzed/games/${gameId}/video`, { videoId });

export const createGame = (input: CreateBuzzedGameInput) =>
  call<BuzzedGame>('POST', '/buzzed/games', input);

export const startGame = (gameId: string) =>
  call<BuzzedGame>('POST', `/buzzed/games/${gameId}/start`, {});

export const completeGame = (gameId: string) =>
  call<BuzzedGame>('POST', `/buzzed/games/${gameId}/complete`, {});

export const pauseGame = (gameId: string) =>
  call<BuzzedGame>('POST', `/buzzed/games/${gameId}/pause`, {});

export const resumeGame = (gameId: string) =>
  call<BuzzedGame>('POST', `/buzzed/games/${gameId}/resume`, {});

export const serverNow = () => call<{ now: number }>('GET', '/buzzed/time').then(r => r.now);
