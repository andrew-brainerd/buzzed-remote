import { describe, expect, it } from 'vitest';

import { defaultBuzzedGameName, parseYouTubeVideoId } from '@/utils/youtube';

describe('parseYouTubeVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ']
  ])('parses %s', (input, expected) => {
    expect(parseYouTubeVideoId(input)).toBe(expected);
  });

  it('ignores a timestamp or playlist hanging off the link — the share sheet adds these', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLabc')).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it.each([
    ['', 'empty'],
    ['https://vimeo.com/12345', 'a non-YouTube host'],
    ['https://www.youtube.com/watch?v=tooshort', 'a malformed id'],
    ['just some words', 'not a link at all']
  ])('rejects %s (%s) rather than handing junk to the Roku', input => {
    expect(parseYouTubeVideoId(input)).toBeNull();
  });
});

describe('defaultBuzzedGameName', () => {
  it('stamps the date so back-to-back quiz nights are told apart', () => {
    expect(defaultBuzzedGameName(new Date('2026-07-12T20:30:00Z'))).toBe('Anime Quiz 2026-07-12');
  });
});
