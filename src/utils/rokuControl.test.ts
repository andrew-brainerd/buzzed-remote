import { beforeEach, describe, expect, it, vi } from 'vitest';

const rokuKeypress = vi.fn().mockResolvedValue(undefined);
const rokuMediaPlayer = vi.fn();
const rokuLaunch = vi.fn().mockResolvedValue(undefined);

vi.mock('@/api/ipc', () => ({
  rokuKeypress: (...args: unknown[]) => rokuKeypress(...args),
  rokuMediaPlayer: (...args: unknown[]) => rokuMediaPlayer(...args),
  rokuLaunch: (...args: unknown[]) => rokuLaunch(...args)
}));

const { castVideo, setRokuPlaying } = await import('@/utils/rokuControl');

const player = (state: string) => ({
  state,
  app_id: '837',
  app_name: 'YouTube',
  position_ms: 21675,
  duration_ms: 900000,
  is_live: false
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ECP `Play` is a play/pause TOGGLE, not a pause key. A blind second press un-pauses the video, so every
// one of these guards a way a real game could break.
describe('setRokuPlaying — idempotent toggle', () => {
  it('presses Play to pause a playing video', async () => {
    rokuMediaPlayer.mockResolvedValue(player('play'));

    await setRokuPlaying('1.2.3.4', false);

    expect(rokuKeypress).toHaveBeenCalledWith('1.2.3.4', 'Play');
  });

  it('does NOT press Play when the video is already paused', async () => {
    rokuMediaPlayer.mockResolvedValue(player('pause'));

    await setRokuPlaying('1.2.3.4', false);

    // A blind toggle here would resume the video the instant someone rang in.
    expect(rokuKeypress).not.toHaveBeenCalled();
  });

  it('does NOT press Play when the video is already playing', async () => {
    rokuMediaPlayer.mockResolvedValue(player('play'));

    await setRokuPlaying('1.2.3.4', true);

    // A blind toggle here would pause the video on resume.
    expect(rokuKeypress).not.toHaveBeenCalled();
  });

  it('presses Play to resume a paused video', async () => {
    rokuMediaPlayer.mockResolvedValue(player('pause'));

    await setRokuPlaying('1.2.3.4', true);

    expect(rokuKeypress).toHaveBeenCalledWith('1.2.3.4', 'Play');
  });

  it('treats buffering and startup as playing, not as paused', async () => {
    for (const state of ['buffer', 'startup']) {
      vi.clearAllMocks();
      rokuMediaPlayer.mockResolvedValue(player(state));

      await setRokuPlaying('1.2.3.4', true);

      // Mid-buffer the video IS on its way to playing; pressing Play would pause it.
      expect(rokuKeypress).not.toHaveBeenCalled();
    }
  });

  it('refuses to send a keypress when nothing is playing', async () => {
    rokuMediaPlayer.mockResolvedValue(player('close'));

    const ok = await setRokuPlaying('1.2.3.4', false);

    // With no media up, Play would be interpreted by whatever screen is showing.
    expect(ok).toBe(false);
    expect(rokuKeypress).not.toHaveBeenCalled();
  });
});

describe('castVideo', () => {
  it('deep-links the YouTube channel to the video', async () => {
    await castVideo('1.2.3.4', '7DZtULvbkHI');

    expect(rokuLaunch).toHaveBeenCalledWith('1.2.3.4', '837', '7DZtULvbkHI', 'video');
  });
});
