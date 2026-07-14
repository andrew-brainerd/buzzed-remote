const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'];

// The Roku deep-launch takes the bare id, so anything that doesn't parse must never reach it.
export const parseYouTubeVideoId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (YOUTUBE_ID.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1];
    return id && YOUTUBE_ID.test(id) ? id : null;
  }

  if (!YOUTUBE_HOSTS.includes(host)) return null;

  const param = url.searchParams.get('v');
  if (param && YOUTUBE_ID.test(param)) return param;

  const [, prefix, id] = url.pathname.split('/');
  if (['embed', 'shorts', 'live', 'v'].includes(prefix ?? '') && id && YOUTUBE_ID.test(id)) return id;

  return null;
};

// en-CA gives YYYY-MM-DD, so it's locale-independent and sortable.
export const defaultBuzzedGameName = (now: Date): string =>
  `Anime Quiz ${now.toLocaleDateString('en-CA')}`;
