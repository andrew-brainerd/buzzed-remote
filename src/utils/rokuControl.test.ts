import { beforeEach, describe, expect, it, vi } from 'vitest';

const rokuKeypress = vi.fn().mockResolvedValue(undefined);
const rokuMediaPlayer = vi.fn();
const rokuLaunch = vi.fn().mockResolvedValue(undefined);
const rokuDeviceInfo = vi.fn();

vi.mock('@/api/ipc', () => ({
  rokuKeypress: (...args: unknown[]) => rokuKeypress(...args),
  rokuMediaPlayer: (...args: unknown[]) => rokuMediaPlayer(...args),
  rokuLaunch: (...args: unknown[]) => rokuLaunch(...args),
  rokuDeviceInfo: (...args: unknown[]) => rokuDeviceInfo(...args)
}));

const { castVideo, ensureRokuOn, setRokuPlaying } = await import('@/utils/rokuControl');

const device = (powerOn: boolean) => ({ name: 'Ernest', model: 'TV', is_tv: true, power_on: powerOn });

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

// ECP `Play` is a TOGGLE, not a pause key — a blind second press un-pauses the video.
describe('setRokuPlaying — idempotent toggle', () => {
  it('presses Play to pause a playing video', async () => {
    rokuMediaPlayer.mockResolvedValue(player('play'));

    await setRokuPlaying('1.2.3.4', false);

    expect(rokuKeypress).toHaveBeenCalledWith('1.2.3.4', 'Play');
  });

  it('does NOT press Play when the video is already paused', async () => {
    rokuMediaPlayer.mockResolvedValue(player('pause'));

    await setRokuPlaying('1.2.3.4', false);

    expect(rokuKeypress).not.toHaveBeenCalled();
  });

  it('does NOT press Play when the video is already playing', async () => {
    rokuMediaPlayer.mockResolvedValue(player('play'));

    await setRokuPlaying('1.2.3.4', true);

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

// A sleeping TV still answers ECP: it accepts the launch and plays the intro to a black screen.
describe('ensureRokuOn', () => {
  it('costs a single request when the TV is already on — no wake, no wait', async () => {
    rokuDeviceInfo.mockResolvedValue(device(true));

    expect(await ensureRokuOn('1.2.3.4')).toBe(true);
    expect(rokuKeypress).not.toHaveBeenCalled();
    expect(rokuDeviceInfo).toHaveBeenCalledTimes(1);
  });

  it('wakes a sleeping TV and waits for the panel to actually come up', async () => {
    rokuDeviceInfo
      .mockResolvedValueOnce(device(false))
      .mockResolvedValueOnce(device(false))
      .mockResolvedValue(device(true));

    expect(await ensureRokuOn('1.2.3.4')).toBe(true);
    expect(rokuKeypress).toHaveBeenCalledWith('1.2.3.4', 'PowerOn');
    // It must not return on the keypress alone — that's the bug it exists to prevent.
    expect(rokuDeviceInfo.mock.calls.length).toBeGreaterThan(1);
  });

  it('rides out ECP requests dropped mid-boot rather than calling the wake a failure', async () => {
    rokuDeviceInfo
      .mockResolvedValueOnce(device(false))
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValue(device(true));

    expect(await ensureRokuOn('1.2.3.4')).toBe(true);
  });

  it('gives up rather than hanging when the TV never comes up', async () => {
    rokuDeviceInfo.mockResolvedValue(device(false));

    // Short timeout so the test doesn't sit for the real 15s.
    expect(await ensureRokuOn('1.2.3.4', 1_200)).toBe(false);
    expect(rokuKeypress).toHaveBeenCalledWith('1.2.3.4', 'PowerOn');
  });

  it('sends PowerOn, never the Play toggle — Play would pause whatever is already up', async () => {
    rokuDeviceInfo.mockResolvedValueOnce(device(false)).mockResolvedValue(device(true));

    await ensureRokuOn('1.2.3.4');

    expect(rokuKeypress).toHaveBeenCalledTimes(1);
    expect(rokuKeypress).not.toHaveBeenCalledWith('1.2.3.4', 'Play');
  });
});
