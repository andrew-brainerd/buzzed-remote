import { useEffect, useState } from 'react';
import * as watch from '@/api/watchApi';
import { useDeviceStore } from '@/stores/deviceStore';
import { useGameStore } from '@/stores/gameStore';
import { defaultBuzzedGameName, parseYouTubeVideoId } from '@/utils/youtube';
import type { YoutubePlaylist, YoutubePlaylistItem } from '@/types/youtube';

const ANSWER_WINDOW_CHOICES = [5_000, 10_000, 15_000, 20_000];

type Source = 'playlist' | 'link';

interface HostGameProps {
  onCancel: () => void;
}

export const HostGame = ({ onCancel }: HostGameProps) => {
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

  const videoId = source === 'playlist' ? pickedVideoId : (parseYouTubeVideoId(videoUrl) ?? '');
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
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">Host a game</h2>
        <button type="button" onClick={onCancel} className="text-xs text-neutral-400 hover:text-white">
          Cancel
        </button>
      </div>

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
          {(['playlist', 'link'] as Source[]).map(option => (
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
              {option === 'playlist' ? 'From a playlist' : 'Paste a link'}
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
        {source === 'playlist' && connected === false && (
          <p className="rounded-md border border-neutral-700 bg-neutral-900 p-3 text-center text-sm text-neutral-400">
            Connect YouTube on brainerd.dev/buzzed first — then your playlists show up here.
          </p>
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
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {items.map(item => (
                  <li key={item.videoId}>
                    <button
                      type="button"
                      onClick={() => setPickedVideoId(item.videoId)}
                      className={`flex w-full items-center gap-2 rounded-md border p-2 text-left ${
                        item.videoId === pickedVideoId
                          ? 'border-brand-500 bg-brand-600/15'
                          : 'border-transparent hover:bg-neutral-800/60'
                      }`}
                    >
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="h-10 w-16 shrink-0 rounded object-cover"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-white">{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
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

        {/* The host is usually the one running the TV, not competing — so playing is opt-in. */}
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
