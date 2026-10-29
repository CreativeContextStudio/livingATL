"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListMusicIcon, PauseIcon, PlayIcon, SkipForwardIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/player";

/**
 * Listening queue (PRD F-queue): a site-wide mini-player that keeps playing
 * while the visitor moves between Timeline, Map, Portal and Browse. Moments
 * and Portal citations are queued as clips (start–end); each plays its range
 * and then advances. Uses a plain streaming <audio> element — no waveform.
 *
 * The full Player page has its own audio, so on `/player/*` the bar hides and
 * the queue pauses (two sources never play at once). The queue is kept per
 * tab in sessionStorage and restored without autoplay.
 */

export type QueueItem = {
  /** Stable identity for de-duplication, e.g. `moment:<catalog>:<index>`. */
  id: string;
  catalogNumber: string;
  title: string;
  storyteller: string | null;
  audioUrl: string;
  start: number;
  end: number;
};

type QueueApi = {
  items: QueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  /** Append (skipping items already queued). `play` starts the first item passed in. */
  enqueue: (items: QueueItem[], opts?: { play?: boolean }) => void;
  isQueued: (id: string) => boolean;
};

const QueueContext = createContext<QueueApi | null>(null);
const STORAGE_KEY = "livingatl-queue-v1";

type Saved = { items: QueueItem[]; currentIndex: number };

/** This tab's saved queue; empty on the server or without storage. */
function readSaved(): Saved {
  if (typeof window === "undefined") return { items: [], currentIndex: -1 };
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && Array.isArray(saved.items)) {
      return {
        items: saved.items,
        currentIndex: Math.min(saved.currentIndex ?? -1, saved.items.length - 1),
      };
    }
  } catch {
    /* storage unavailable — start empty */
  }
  return { items: [], currentIndex: -1 };
}

const subscribeNoop = () => () => {};

export function useListeningQueue(): QueueApi {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useListeningQueue must be used inside <ListeningQueueProvider>");
  return ctx;
}

export function ListeningQueueProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Restored from sessionStorage in the initializer (no autoplay). Anything
  // rendered from it waits for `hydrated`, so the server render and the
  // client's hydration render match.
  const [initial] = useState(readSaved);
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [items, setItems] = useState<QueueItem[]>(initial.items);
  const [currentIndex, setCurrentIndex] = useState(initial.currentIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const pathname = usePathname() ?? "/";
  const onPlayerPage = pathname.startsWith("/player/");
  const current = currentIndex >= 0 ? items[currentIndex] : undefined;

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ items, currentIndex }));
    } catch {
      /* storage unavailable — queue just won't survive a reload */
    }
  }, [items, currentIndex]);

  const playIndex = useCallback(
    (index: number, list: QueueItem[]) => {
      const audio = audioRef.current;
      const item = list[index];
      if (!audio || !item) return;
      setCurrentIndex(index);
      const src = new URL(item.audioUrl, window.location.href).toString();
      const start = () => {
        audio.currentTime = item.start;
        void audio.play().catch(() => setIsPlaying(false));
      };
      if (audio.src !== src) {
        audio.src = src;
        audio.addEventListener("loadedmetadata", start, { once: true });
        audio.load();
      } else {
        start();
      }
    },
    [],
  );

  const enqueue = useCallback<QueueApi["enqueue"]>(
    (incoming, opts) => {
      setItems((prev) => {
        const known = new Set(prev.map((i) => i.id));
        const fresh = incoming.filter((i) => !known.has(i.id));
        const next = [...prev, ...fresh];
        if (opts?.play) {
          // Start at the first item passed in, wherever it sits — even if
          // it (or a later one) was already queued. After this state
          // commits; playIndex reads the new list directly.
          const target = next.findIndex((i) => i.id === incoming[0]?.id);
          if (target >= 0) queueMicrotask(() => playIndex(target, next));
        }
        return next;
      });
    },
    [playIndex],
  );

  const visibleItems = useMemo(() => (hydrated ? items : []), [hydrated, items]);
  const isQueued = useCallback(
    (id: string) => visibleItems.some((i) => i.id === id),
    [visibleItems],
  );

  const next = useCallback(() => {
    if (currentIndex + 1 < items.length) playIndex(currentIndex + 1, items);
    else {
      audioRef.current?.pause();
      setCurrentIndex(-1);
    }
  }, [currentIndex, items, playIndex]);

  // Advance when the current clip's range is done.
  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    setPosition(audio.currentTime);
    if (audio.currentTime >= current.end - 0.05) next();
  };

  // The Player page owns playback there.
  useEffect(() => {
    if (onPlayerPage) audioRef.current?.pause();
  }, [onPlayerPage]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current) {
      if (items.length > 0) playIndex(0, items);
      return;
    }
    if (audio.paused) {
      if (!audio.src) playIndex(currentIndex, items);
      else void audio.play().catch(() => setIsPlaying(false));
    } else audio.pause();
  };

  const remove = (index: number) => {
    const wasCurrent = index === currentIndex;
    const nextItems = items.filter((_, i) => i !== index);
    setItems(nextItems);
    if (wasCurrent) {
      audioRef.current?.pause();
      setCurrentIndex(-1);
    } else if (index < currentIndex) setCurrentIndex(currentIndex - 1);
  };

  const clear = () => {
    audioRef.current?.pause();
    setItems([]);
    setCurrentIndex(-1);
  };

  const api = useMemo<QueueApi>(
    () => ({ items: visibleItems, currentIndex, isPlaying, enqueue, isQueued }),
    [visibleItems, currentIndex, isPlaying, enqueue, isQueued],
  );

  const [open, setOpen] = useState(false);
  const showBar = hydrated && items.length > 0 && !onPlayerPage;
  // Pinned UI elsewhere (the Portal's question box) sits above the bar.
  useEffect(() => {
    document.documentElement.style.setProperty("--queue-bar-h", showBar ? "4rem" : "0px");
  }, [showBar]);
  const shown = current ?? items[0];

  return (
    <QueueContext.Provider value={api}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onEnded={next}
      />
      {showBar ? (
        <>
          {/* Keeps the page's last content clear of the fixed bar. */}
          <div aria-hidden className="h-16 print:hidden" />
          <section
            aria-label="Listening queue"
            className="fixed inset-x-0 bottom-0 z-[var(--z-overlay)] print:hidden border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
          >
            {open ? (
              <ol className="mx-auto max-h-[40dvh] w-full max-w-7xl overflow-y-auto border-b border-border px-4 py-2">
                {items.map((item, i) => (
                  <li key={item.id} className="flex items-center gap-3 py-1.5 text-sm">
                    <button
                      type="button"
                      onClick={() => playIndex(i, items)}
                      aria-current={i === currentIndex ? "true" : undefined}
                      className="min-w-0 flex-1 truncate text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=true]:font-semibold"
                    >
                      {item.title}
                      <span className="text-muted-foreground"> · {item.storyteller ?? item.catalogNumber}</span>
                    </button>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatTimestamp(item.start)}–{formatTimestamp(item.end)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`Remove ${item.title} from the queue`}
                      className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <XIcon aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4">
              <Button
                size="icon"
                onClick={toggle}
                aria-label={isPlaying ? "Pause queue" : "Play queue"}
                className="rounded-full"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{shown?.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {shown?.storyteller ?? shown?.catalogNumber}
                  {current ? (
                    <span className="font-mono tabular-nums">
                      {" "}· {formatTimestamp(Math.max(position, current.start))} / {formatTimestamp(current.end)}
                    </span>
                  ) : null}
                </p>
              </div>
              {shown ? (
                <Link
                  href={`/player/${encodeURIComponent(shown.catalogNumber)}?t=${formatTimestamp(Math.floor(current ? Math.max(position, shown.start) : shown.start))}`}
                  className="hidden text-sm font-medium text-primary-ink underline-offset-4 hover:underline sm:inline"
                >
                  Open in Player
                </Link>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                onClick={next}
                disabled={currentIndex + 1 >= items.length}
                aria-label="Next in queue"
              >
                <SkipForwardIcon />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={`Queue, ${items.length} item${items.length === 1 ? "" : "s"}`}
              >
                <ListMusicIcon aria-hidden />
                {items.length}
              </Button>
              <Button size="icon" variant="ghost" onClick={clear} aria-label="Clear queue">
                <XIcon />
              </Button>
            </div>
          </section>
        </>
      ) : null}
    </QueueContext.Provider>
  );
}
