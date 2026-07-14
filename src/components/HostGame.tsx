import { useCallback, useEffect, useRef, useState } from 'react';
import * as watch from '@/api/watchApi';
import { useDeviceStore } from '@/stores/deviceStore';
import { useGameStore } from '@/stores/gameStore';
import { defaultBuzzedGameName, parseYouTubeVideoId } from '@/utils/youtube';
import { VideoResultList } from '@/components/VideoResultList';
import type { YoutubePlaylist, YoutubePlaylistItem } from '@/types/youtube';

const ANSWER_WINDOW_CHOICES = [5_000, 10_000, 15_000, 20_000];

type Source = 'playlist' | 'search' | 'link';

const SOURCE_LABELS: Record<Source, string> = {
  playlist: 'Playlist',
  search: 'Search',
  link: 'Link'
};

export const HostGame = () => {
  const { host, busy, error } = useGameStore();
  const activeDevice = useDeviceStore(s => s.activeDevice());

  const [name, setName] = useState('');
  const [source, setSource] = useState<Source>('playlist');
  const [videoUrl, setVideoUrl] = useState('');
  const [answerWindowMs, setAnswerWindowMs] = useState(10_000);
  const [hostPlaying, setHostPlaying] = useState(false);

  const [connected, setConnected] = useState<boolean | null>(null);
  const [playlists, setPlaylists] = useState<YoutubePlaylist[]>([]);
  const [playlistId, setPlaylistId] = useState('');
  const [items, setItems] = useState<YoutubePlaylistItem[]>([]);
  const [pickedVideoId, setPickedVideoId] = useState('');
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YoutubePlaylistItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  // A ref, not the `searching` state: the observer can fire again before a state update has rendered,
  // which would fetch the same page twice.
  const fetchingRef = useRef(false);

  useEffect(() => {
    void watch
      .getYoutubeConnection()
      .then(setConnected)
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (!connected) return;
    setLoading(true);
    void watch
      .getYoutubePlaylists()
      .then(setPlaylists)
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  }, [connected]);

  const onPickPlaylist = (id: string) => {
    setPlaylistId(id);
    setItems([]);
    setPickedVideoId('');
    if (!id) return;

    setLoading(true);
    void watch
      .getYoutubePlaylistItems(id)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  // search.list costs 100 quota units a call against a 10k/day pool, so this only ever fires on submit.
  const onSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || fetchingRef.current) return;

    fetchingRef.current = true;
    setSearching(true);
    setSearched(true);
    try {
      const page = await watch.searchYoutubeVideos(trimmed);
      setResults(page.items);
      setNextPageToken(page.nextPageToken);
    } catch {
      setResults([]);
      setNextPageToken(undefined);
    } finally {
      fetchingRef.current = false;
      setSearching(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!nextPageToken || fetchingRef.current) return;

    fetchingRef.current = true;
    setSearching(true);
    try {
      const page = await watch.searchYoutubeVideos(query.trim(), nextPageToken);
      setResults(current => [...current, ...page.items]);
      setNextPageToken(page.nextPageToken);
    } catch {
      setNextPageToken(undefined);
    } finally {
      fetchingRef.current = false;
      setSearching(false);
    }
  }, [nextPageToken, query]);

  const videoId = source === 'link' ? (parseYouTubeVideoId(videoUrl) ?? '') : pickedVideoId;
  const ready = !!videoId && !!activeDevice && !busy;

  const onCreate = () => {
    if (!videoId) return;
    void host({
      name: name.trim() || defaultBuzzedGameName(new Date()),
      videoId,
      answerWindowMs,
      hostPlaying
    });
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="font-semibold text-white">Host a game</h2>

      <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Name (optional)</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={defaultBuzzedGameName(new Date())}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-white placeholder:text-neutral-600 focus:border-brand-500 focus:outline-none"
          />
        </label>

        <div className="flex gap-2">
          {(Object.keys(SOURCE_LABELS) as Source[]).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setSource(option)}
              className={`flex-1 rounded-md border py-1.5 text-sm ${
                source === option
                  ? 'border-brand-500 bg-brand-600/20 text-white'
                  : 'border-neutral-700 text-neutral-400'
              }`}
            >
              {SOURCE_LABELS[option]}
            </button>
          ))}
        </div>

        {source === 'link' && (
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">YouTube link</span>
            <input
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="youtube.com/watch?v=…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-white placeholder:text-neutral-600 focus:border-brand-500 focus:outline-none"
            />
            {videoUrl && !parseYouTubeVideoId(videoUrl) && (
              <span className="mt-1 block text-xs text-red-400">That’s not a YouTube link.</span>
            )}
          </label>
        )}

        {/* Connecting has to happen on the web: the OAuth callback identifies you by the brainerd session
            cookie, which this webview doesn't carry. Once connected there, the app just reads it. */}
        {(source === 'playlist' || source === 'search') && connected === false && (
          <p className="rounded-md border border-neutral-700 bg-neutral-900 p-3 text-center text-sm text-neutral-400">
            Connect YouTube on brainerd.dev/buzzed first — then you can browse and search here.
          </p>
        )}

        {source === 'search' && connected && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void onSearch()}
                placeholder="anime opening quiz"
                autoCapitalize="none"
                autoCorrect="off"
                className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-white placeholder:text-neutral-600 focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void onSearch()}
                disabled={!query.trim() || searching}
                className="shrink-0 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Search
              </button>
            </div>

            {searched && !searching && results.length === 0 && (
              <p className="text-sm text-neutral-500">Nothing found.</p>
            )}

            {results.length > 0 && (
              <VideoResultList
                items={results}
                selectedVideoId={pickedVideoId}
                onPick={setPickedVideoId}
                onEndReached={nextPageToken ? loadMore : undefined}
                loading={searching}
              />
            )}
          </div>
        )}

        {source === 'playlist' && connected && (
          <div className="space-y-2">
            <select
              value={playlistId}
              onChange={e => onPickPlaylist(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="">Choose a playlist…</option>
              {playlists.map(playlist => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.title} ({playlist.itemCount})
                </option>
              ))}
            </select>

            {loading && <p className="text-sm text-neutral-500">Loading…</p>}

            {items.length > 0 && (
              <VideoResultList
                items={items}
                selectedVideoId={pickedVideoId}
                onPick={setPickedVideoId}
              />
            )}
          </div>
        )}

        <div>
          <span className="mb-1 block text-xs text-neutral-400">Time to answer</span>
          <div className="flex gap-2">
            {ANSWER_WINDOW_CHOICES.map(ms => (
              <button
                key={ms}
                type="button"
                onClick={() => setAnswerWindowMs(ms)}
                className={`flex-1 rounded-md border py-2 text-sm ${
                  ms === answerWindowMs
                    ? 'border-brand-500 bg-brand-600/20 text-white'
                    : 'border-neutral-700 text-neutral-300'
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={hostPlaying}
            onChange={e => setHostPlaying(e.target.checked)}
            className="h-4 w-4"
          />
          I’m playing too
        </label>

        <p className="text-xs text-neutral-500">
          {activeDevice ? `Playing on ${activeDevice.name}` : 'Pick a Roku first — the video plays on the TV.'}
        </p>
      </div>

      <button
        type="button"
        onClick={onCreate}
        disabled={!ready}
        className="w-full rounded-lg bg-brand-600 py-3 font-semibold text-white disabled:opacity-40"
      >
        Create game
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
};
