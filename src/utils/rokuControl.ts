import { rokuDeviceInfo, rokuKeypress, rokuLaunch, rokuMediaPlayer } from '@/api/ipc';

// Roku's YouTube channel id (verified on Ernest).
export const YOUTUBE_CHANNEL_ID = '837';

// A sleeping TV still answers ECP: it accepts the launch and plays to a black screen. So the cast has to
// wait for the panel to be up, not just for the request to succeed.
const POWER_ON = 'PowerOn';
const WAKE_POLL_MS = 500;
const WAKE_TIMEOUT_MS = 15_000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Returns false if the TV never came up. `PowerOn` is not a toggle (unlike Play), so a redundant press is
// harmless — but the common case is an already-on TV, which should cost one request rather than a wait.
export const ensureRokuOn = async (ip: string, timeoutMs = WAKE_TIMEOUT_MS): Promise<boolean> => {
  const info = await rokuDeviceInfo(ip);
  if (info.power_on) return true;

  await rokuKeypress(ip, POWER_ON);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(WAKE_POLL_MS);
    // A waking TV drops requests mid-boot; a failed poll is not a failed wake.
    const current = await rokuDeviceInfo(ip).catch(() => null);
    if (current?.power_on) return true;
  }

  return false;
};

// ECP has no pause key — `keypress/Play` is a TOGGLE, so firing it twice resumes the video. Never toggle
// blind: read the real state first and only press when the device isn't already where we want it.
const PLAY = 'Play';

const isPlaying = (state: string) => state === 'play' || state === 'buffer' || state === 'startup';

export const setRokuPlaying = async (ip: string, wantPlaying: boolean): Promise<boolean> => {
  const player = await rokuMediaPlayer(ip);

  // Nothing is up — a keypress here would do something unpredictable.
  if (player.state === 'close') return false;

  if (isPlaying(player.state) === wantPlaying) return true;

  await rokuKeypress(ip, PLAY);
  return true;
};

export const castVideo = (ip: string, videoId: string) =>
  rokuLaunch(ip, YOUTUBE_CHANNEL_ID, videoId, 'video');

export const readRokuPosition = async (ip: string): Promise<number | null> => {
  const player = await rokuMediaPlayer(ip);
  return player.position_ms == null ? null : Math.round(player.position_ms / 1000);
};
