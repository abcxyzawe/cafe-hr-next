"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Music,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generatePlaylistDjAction } from "./generate-action";
import {
  INITIAL_PLAYLIST_DJ_STATE,
  PLAYLIST_DJ_TIME_SLOTS,
  PLAYLIST_DJ_VIBES,
  playlistDjTimeSlotLabel,
  playlistDjVibeLabel,
  type PlaylistDjState,
} from "./playlist-dj-types";
import type { PlaylistDjTrack } from "@/lib/xai";

function youtubeSearchUrl(title: string, artist: string): string {
  const q = `${title} ${artist}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

function trackCopyText(title: string, artist: string): string {
  return `${title} - ${artist}`;
}

export function PlaylistDjForm() {
  const [state, formAction, pending] = useActionState<
    PlaylistDjState,
    FormData
  >(generatePlaylistDjAction, INITIAL_PLAYLIST_DJ_STATE);

  const [timeSlot, setTimeSlot] = useState<PlaylistDjState["timeSlot"]>(
    INITIAL_PLAYLIST_DJ_STATE.timeSlot,
  );
  const [vibe, setVibe] = useState<PlaylistDjState["vibe"]>(
    INITIAL_PLAYLIST_DJ_STATE.vibe,
  );
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.tracks !== null) {
      setTimeSlot(state.timeSlot);
      setVibe(state.vibe);
    }
  }, [state.tracks, state.timeSlot, state.vibe]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const tracks = state.tracks;
  const hasResults = tracks !== null && tracks.length > 0;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Khung giờ trong ngày</Label>
          <div
            role="radiogroup"
            aria-label="Khung giờ"
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {PLAYLIST_DJ_TIME_SLOTS.map((opt) => {
              const selected = timeSlot === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="timeSlot"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setTimeSlot(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  <span>{opt.label}</span>
                  <span
                    className={
                      "text-[11px] font-normal " +
                      (selected
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground")
                    }
                  >
                    {opt.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="playlist-dj-vibe" className="text-sm font-medium">
            Vibe mong muốn
          </Label>
          <Select
            id="playlist-dj-vibe"
            name="vibe"
            value={vibe}
            onChange={(e) => {
              const v = e.target.value;
              const match = PLAYLIST_DJ_VIBES.find((vb) => vb.value === v);
              if (match) setVibe(match.value);
            }}
            disabled={pending}
          >
            {PLAYLIST_DJ_VIBES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang chọn nhạc..."
              : hasResults
                ? "Gợi ý lại 6 bài"
                : "Gợi ý 6 bài"}
          </Button>
        </div>
      </form>

      {pending && !hasResults ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang chọn 6 bài nhạc cho bạn...
        </div>
      ) : null}

      {hasResults ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Music className="size-3" />
              Playlist — {playlistDjTimeSlotLabel(state.timeSlot)} ·{" "}
              {playlistDjVibeLabel(state.vibe)}
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {tracks.length} bài
            </span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track, idx) => (
              <PlaylistDjCard key={`${track.title}-${idx}`} track={track} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

type PlaylistDjCardProps = {
  track: PlaylistDjTrack;
};

function PlaylistDjCard({ track }: PlaylistDjCardProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const text = trackCopyText(track.title, track.artist);
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("Clipboard API không khả dụng");
      }
      setCopied(true);
      toast.success(`Đã sao chép: ${text}`);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Không sao chép được. Hãy chọn và copy thủ công.");
    }
  }, [track.title, track.artist]);

  const ytUrl = youtubeSearchUrl(track.title, track.artist);

  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold leading-snug">{track.title}</h3>
        <p className="text-sm font-medium text-muted-foreground">
          {track.artist}
        </p>
      </div>
      <p className="text-sm italic leading-relaxed text-muted-foreground">
        {track.reason}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant={copied ? "default" : "outline"}
          onClick={handleCopy}
          aria-label={`Sao chép ${track.title} - ${track.artist}`}
        >
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? "Đã chép" : "Sao chép"}
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={ytUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            Tìm trên YouTube
          </a>
        </Button>
      </div>
    </li>
  );
}
