export type BuzzedGameStatus = 'lobby' | 'active' | 'completed';

export type BuzzedTarget = 'host' | 'synced' | 'roku';

export type BuzzedQuestionState = 'armed' | 'answering' | 'grading' | 'complete';

export type BuzzedGrade = 'correct' | 'missed';

export interface BuzzedPlayer {
  userId: string;
  displayName: string;
  color?: string;
  photoURL?: string;
}

export interface BuzzedSettings {
  answerWindowMs: number;
}

export interface BuzzedPlayback {
  playing: boolean;
  positionSec: number;
  updatedAt: number;
  resumeAt?: number;
  seekToSec?: number;
  seekAt?: number;
}

export interface BuzzedRingIn {
  userId: string;
  ringAt: number;
  buzzMs: number;
  grade?: BuzzedGrade;
  gradedAt?: number;
  points?: number;
}

export interface BuzzedQuestion {
  index: number;
  state: BuzzedQuestionState;
  videoId?: string;
  armedAt: number;
  rearmedAt: number;
  answerCloseAt?: number;
  pausedAtPositionSec?: number;
  ringIns: BuzzedRingIn[];
  closedAt?: number;
}

export interface BuzzedGame {
  id: string;
  ownerUserId: string;
  participantUserIds: string[];
  joinCode: string;
  name: string;
  status: BuzzedGameStatus;
  target: BuzzedTarget;
  rokuDeviceIp?: string;
  players: BuzzedPlayer[];
  scores: Record<string, number>;
  settings: BuzzedSettings;
  videoId?: string;
  videoTitle?: string;
  playback: BuzzedPlayback;
  currentQuestion: BuzzedQuestion | null;
  history: BuzzedQuestion[];
  createdAt: number;
  pausedAt?: number;
}

export interface CreateBuzzedGameInput {
  name?: string;
  target?: BuzzedTarget;
  rokuDeviceIp?: string;
  settings?: Partial<BuzzedSettings>;
  color?: string;
  videoId?: string;
  hostPlaying?: boolean;
}

export interface BuzzResponse {
  rang: boolean;
  position?: number;
  game: BuzzedGame;
}
