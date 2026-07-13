import { rokuKeypress, rokuLaunch, rokuMediaPlayer } from '@/api/ipc';

// Roku's YouTube channel id (verified on Ernest).
export const YOUTUBE_CHANNEL_ID = '837';

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
