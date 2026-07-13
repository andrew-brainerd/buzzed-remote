import { useState } from 'react';
import { useDeviceStore } from '@/stores/deviceStore';
import { useGameStore } from '@/stores/gameStore';
import { parseYouTubeVideoId } from '@/utils/youtube';

const ANSWER_WINDOW_CHOICES = [5_000, 10_000, 15_000, 20_000];

interface HostGameProps {
  onCancel: () => void;
}

export const HostGame = ({ onCancel }: HostGameProps) => {
  const { host, busy, error } = useGameStore();
  const activeDevice = useDeviceStore(s => s.activeDevice());

  const [name, setName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [answerWindowMs, setAnswerWindowMs] = useState(10_000);
  const [hostPlaying, setHostPlaying] = useState(false);

  const videoId = parseYouTubeVideoId(videoUrl);
  const ready = !!videoId && !!activeDevice && !busy;

  const onCreate = () => {
    if (!videoId) return;
    void host({
      name: name.trim() || 'Anime quiz',
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
          <span className="mb-1 block text-xs text-neutral-400">Game name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Anime quiz"
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-white placeholder:text-neutral-600 focus:border-brand-500 focus:outline-none"
          />
        </label>

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
          {videoUrl && !videoId && (
            <span className="mt-1 block text-xs text-red-400">That’s not a YouTube link.</span>
          )}
        </label>

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
