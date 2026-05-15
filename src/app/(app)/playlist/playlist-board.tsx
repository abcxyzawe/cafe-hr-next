"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  CheckCircle2,
  CirclePlay,
  Music,
  Pause,
  Play,
  Sparkles,
  Trash2,
  Video,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  PLAYLIST_EVENT,
  STORAGE_KEY,
  addTrack,
  deleteTrack,
  detectPlatform,
  getTracks,
  setNowPlaying,
  type Platform,
  type PlaylistTrack,
} from "@/lib/playlist-state";

type SeedSample = { title: string; url: string };

const SEED_SAMPLES: SeedSample[] = [
  {
    title: "Lofi hip hop radio – beats to relax/study to",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
  },
  {
    title: "Lofi hip hop radio – beats to sleep/chill to",
    url: "https://www.youtube.com/watch?v=5qap5aO4i9A",
  },
  {
    title: "Smooth Jazz Cafe – relaxing background",
    url: "https://www.youtube.com/watch?v=DWcJFNfaw9c",
  },
  {
    title: "Spotify – Cafe pick",
    url: "https://open.spotify.com/track/7E8ld1WMkURpyOf3bF8RTd",
  },
];

const PLATFORM_LABEL: Record<Platform, string> = {
  spotify: "Spotify",
  youtube: "YouTube",
  unknown: "Không rõ",
};

function PlatformChip({ platform }: { platform: Platform }) {
  if (platform === "spotify") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
        <CirclePlay className="size-3" />
        Spotify
      </span>
    );
  }
  if (platform === "youtube") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
        <Video className="size-3" />
        YouTube
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      Không rõ
    </span>
  );
}

export function PlaylistBoard() {
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTracks(getTracks());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setTracks(getTracks());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PLAYLIST_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PLAYLIST_EVENT, onCustom);
    };
  }, [hydrated]);

  const detectedPlatform = useMemo<Platform>(
    () => detectPlatform(urlInput),
    [urlInput],
  );
  const urlTrimmed = urlInput.trim();
  const platformValid =
    urlTrimmed !== "" && detectedPlatform !== "unknown";
  const platformInvalid =
    urlTrimmed !== "" && detectedPlatform === "unknown";

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTitleInput(e.target.value);
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = titleInput.trim();
    const url = urlInput.trim();
    if (!title) {
      setError("Vui lòng nhập tên bài hát hoặc playlist.");
      return;
    }
    if (!url) {
      setError("Vui lòng dán link Spotify hoặc YouTube.");
      return;
    }
    const created = addTrack({ title, url });
    if (!created) {
      setError(
        "Link không hợp lệ — chỉ hỗ trợ Spotify (track/playlist/album) hoặc YouTube (watch/youtu.be/playlist).",
      );
      return;
    }
    setTitleInput("");
    setUrlInput("");
    setError(null);
  };

  const handleSeed = useCallback(() => {
    for (const sample of SEED_SAMPLES) {
      addTrack({ title: sample.title, url: sample.url });
    }
  }, []);

  const handleDelete = useCallback((id: string, title: string) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(`Bỏ "${title}" khỏi playlist?`);
      if (!ok) return;
    }
    deleteTrack(id);
  }, []);

  const handleTogglePlay = useCallback(
    (id: string, isPlaying: boolean) => {
      setNowPlaying(isPlaying ? null : id);
    },
    [],
  );

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const nowPlayingCount = tracks.reduce(
    (acc, t) => (t.nowPlaying ? acc + 1 : acc),
    0,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thêm bài mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3"
            aria-label="Thêm bài vào playlist"
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <Input
                type="text"
                placeholder="Tên bài hát / playlist…"
                value={titleInput}
                onChange={handleTitleChange}
                maxLength={200}
                className="h-9"
              />
              <div className="relative">
                <Input
                  type="url"
                  placeholder="Dán link Spotify hoặc YouTube…"
                  value={urlInput}
                  onChange={handleUrlChange}
                  className={cn(
                    "h-9 pr-9",
                    platformValid &&
                      "border-emerald-400 focus-visible:ring-emerald-300 dark:border-emerald-500/60",
                    platformInvalid &&
                      "border-rose-400 focus-visible:ring-rose-300 dark:border-rose-500/60",
                  )}
                  inputMode="url"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                  {platformValid ? (
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  ) : platformInvalid ? (
                    <XCircle className="size-4 text-rose-600 dark:text-rose-400" />
                  ) : null}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {urlTrimmed === "" ? (
                  <span>
                    Hỗ trợ link Spotify (track/playlist/album) và YouTube
                    (watch/youtu.be/playlist).
                  </span>
                ) : platformValid ? (
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">
                    Đã nhận diện: {PLATFORM_LABEL[detectedPlatform]}
                  </span>
                ) : (
                  <span className="font-medium text-rose-700 dark:text-rose-300">
                    Không nhận diện được nền tảng từ link này.
                  </span>
                )}
              </div>
              <Button type="submit" size="sm">
                <Music className="size-4" />
                Thêm vào playlist
              </Button>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
              >
                {error}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="text-xs text-muted-foreground">
          {tracks.length === 0 ? (
            <span>Chưa có bài nào — thêm link hoặc tải mẫu để bắt đầu.</span>
          ) : nowPlayingCount > 0 ? (
            <span className="font-medium text-amber-700 dark:text-amber-300">
              Đang phát {nowPlayingCount} bài trong tổng {tracks.length} mục.
            </span>
          ) : (
            <span>{tracks.length} bài trong playlist — chưa chọn bài đang phát.</span>
          )}
        </div>
        {tracks.length === 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={handleSeed}>
            <Sparkles className="size-4" />
            Tải mẫu
          </Button>
        ) : null}
      </div>

      {tracks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Music className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Playlist còn trống</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Dán một link YouTube hoặc Spotify ở phía trên, hoặc bấm
              &quot;Tải mẫu&quot; để thêm 4 bài lo-fi/jazz quen thuộc cho không
              gian quán.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tracks.map((track) => (
            <PlaylistCard
              key={track.id}
              track={track}
              onToggle={handleTogglePlay}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type PlaylistCardProps = {
  track: PlaylistTrack;
  onToggle: (id: string, isPlaying: boolean) => void;
  onDelete: (id: string, title: string) => void;
};

function PlaylistCard({ track, onToggle, onDelete }: PlaylistCardProps) {
  const playing = track.nowPlaying;
  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden transition-all",
        playing &&
          "ring-2 ring-amber-400 shadow-md dark:ring-amber-500/60",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-2 text-sm">
              {playing ? (
                <span className="mr-1.5" aria-hidden="true">
                  🎵
                </span>
              ) : null}
              {track.title}
            </CardTitle>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <PlatformChip platform={track.platform} />
              {playing ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                  <span
                    aria-hidden="true"
                    className="inline-block size-1.5 animate-pulse rounded-full bg-amber-600 dark:bg-amber-300"
                  />
                  Đang phát
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <iframe
            src={track.embedUrl}
            title={track.title}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
          />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant={playing ? "default" : "outline"}
            onClick={() => onToggle(track.id, playing)}
            aria-pressed={playing}
          >
            {playing ? (
              <>
                <Pause className="size-4" />
                Dừng đánh dấu
              </>
            ) : (
              <>
                <Play className="size-4" />
                Đang phát
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onDelete(track.id, track.title)}
            className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            <Trash2 className="size-4" />
            Bỏ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
