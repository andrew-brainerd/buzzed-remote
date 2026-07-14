import { useEffect, useRef } from 'react';
import type { YoutubePlaylistItem } from '@/types/youtube';

interface VideoResultListProps {
  items: YoutubePlaylistItem[];
  selectedVideoId: string;
  onPick: (videoId: string) => void;
  // Omit for a list that's already whole (a playlist). Search pages in 10 at a time.
  onEndReached?: () => void;
  loading?: boolean;
}

export const VideoResultList = ({
  items,
  selectedVideoId,
  onPick,
  onEndReached,
  loading
}: VideoResultListProps) => {
  const scrollRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);

  const onEndReachedRef = useRef(onEndReached);
  useEffect(() => {
    onEndReachedRef.current = onEndReached;
  }, [onEndReached]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !onEndReached) return;

    // `root` is the scrolling <ul>, not the viewport — the list scrolls inside its own box, so a
    // viewport-rooted observer would fire on mount and never again.
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) onEndReachedRef.current?.();
      },
      { root: scrollRef.current, rootMargin: '120px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onEndReached, items.length]);

  return (
    <ul ref={scrollRef} className="max-h-64 space-y-1 overflow-y-auto">
      {items.map(item => (
        <li key={item.videoId}>
          <button
            type="button"
            onClick={() => onPick(item.videoId)}
            className={`flex w-full items-center gap-2 rounded-md border p-2 text-left ${
              item.videoId === selectedVideoId
                ? 'border-brand-500 bg-brand-600/15'
                : 'border-transparent hover:bg-neutral-800/60'
            }`}
          >
            <img src={item.thumbnail} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
            <span className="min-w-0 flex-1 truncate text-sm text-white">{item.title}</span>
          </button>
        </li>
      ))}

      {onEndReached && (
        <li ref={sentinelRef} className="py-2 text-center text-xs text-neutral-600">
          {loading ? 'Loading…' : ''}
        </li>
      )}
    </ul>
  );
};
