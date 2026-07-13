import { rokuDeviceInfo, rokuKeypress, rokuLaunch, rokuMediaPlayer } from '@/api/ipc';

// Roku's YouTube channel id (verified on Ernest).
export const YOUTUBE_CHANNEL_ID = '837';

// A TV that's asleep still answers ECP — it accepts the launch, and then nothing happens on a black
// screen. So the cast has to wait for the panel to actually be up, not just for the request to succeed.
const POWER_ON = 'PowerOn';
const WAKE_POLL_MS = 500;
const WAKE_TIMEOUT_MS = 15_000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wake the device if it's off, and don't return until it says it's on. `PowerOn` is NOT a toggle (unlike
// Play), so sending it to an already-on TV is harmless — but we check first anyway, because the common
// case is an already-on TV and that should cost one request, not a wake plus a wait.
// Returns false if it never came up; the caller decides whether to cast anyway.
export const ensureRokuOn = async (ip: string, timeoutMs = WAKE_TIMEOUT_MS): Promise<boolean> => {
  const info = await rokuDeviceInfo(ip);
  if (info.power_on) return true;

  await rokuKeypress(ip, POWER_ON);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(WAKE_POLL_MS);
    // A waking TV can drop ECP requests mid-boot; a failed poll is not a failed wake.
    const current = await rokuDeviceInfo(ip).catch(() => null);
    if (current?.power_on) return true;
  }

  return false;
};

// Roku's ECP has NO distinct pause key — `keypress/Play` is a play/pause TOGGLE. Fire it twice and the
// video is playing again. So we never toggle blind: read the real state first and only send the keypress
// when the device isn't already where we want it.
//
// Verified on-device (Ernest, YouTube 2.26.74): /query/media-player reports state="play"|"pause" and a
// live position, and Play toggles cleanly — position freezes on pause and advances again on resume. That
// makes this idempotent: a duplicate call, a retry, or two clients racing can't flip the video the wrong
// way.
const PLAY = 'Play';

const isPlaying = (state: string) => state === 'play' || state === 'buffer' || state === 'startup';

export const setRokuPlaying = async (ip: string, wantPlaying: boolean): Promise<boolean> => {
  const player = await rokuMediaPlayer(ip);

  // Nothing is playing (or the app isn't up) — a keypress here would do something unpredictable.
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
