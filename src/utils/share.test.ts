import { afterEach, describe, expect, it, vi } from 'vitest';

import { buzzedJoinUrl, shareJoinLink } from '@/utils/share';

const setNavigator = (props: Record<string, unknown>) => {
  Object.assign(navigator, props);
};

afterEach(() => {
  setNavigator({ share: undefined, clipboard: undefined });
  vi.restoreAllMocks();
});

describe('buzzedJoinUrl', () => {
  it('points at the web join route, not the bare code', () => {
    expect(buzzedJoinUrl('ABC12')).toBe('https://brainerd.dev/buzzed/join/ABC12');
  });
});

describe('shareJoinLink', () => {
  it('uses the native share sheet when the webview has one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share });

    expect(await shareJoinLink('ABC12', 'Anime Quiz')).toBe('shared');
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://brainerd.dev/buzzed/join/ABC12' })
    );
  });

  it('falls back to the clipboard when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share: undefined, clipboard: { writeText } });

    expect(await shareJoinLink('ABC12', 'Anime Quiz')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://brainerd.dev/buzzed/join/ABC12');
  });

  it('does NOT silently copy when the user dismisses the share sheet', async () => {
    // Dismissing rejects exactly like a failure does. Falling through to the clipboard here would tell
    // someone who just cancelled that their link was copied.
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share: vi.fn().mockRejectedValue(new Error('AbortError')), clipboard: { writeText } });

    expect(await shareJoinLink('ABC12', 'Anime Quiz')).toBe('failed');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('reports failure rather than throwing when the clipboard is blocked too', async () => {
    setNavigator({
      share: undefined,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }
    });

    expect(await shareJoinLink('ABC12', 'Anime Quiz')).toBe('failed');
  });
});
