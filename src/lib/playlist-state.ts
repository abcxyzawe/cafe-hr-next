export const STORAGE_KEY = "cafe-hr-playlist";
export const PLAYLIST_EVENT = "cafe-hr:playlist-changed";

export type Platform = "spotify" | "youtube" | "unknown";

export type PlaylistTrack = {
  id: string;
  title: string;
  url: string;
  platform: Platform;
  embedUrl: string;
  addedAt: string;
  nowPlaying: boolean;
};

const SPOTIFY_RE =
  /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|playlist|album|episode|show)\/([A-Za-z0-9]+)(?:[/?#].*)?$/i;
const YOUTUBE_WATCH_RE =
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})(?:[&#].*)?$/i;
const YOUTUBE_SHORT_RE = /^https?:\/\/youtu\.be\/([\w-]{6,})(?:[/?#].*)?$/i;
const YOUTUBE_PLAYLIST_RE =
  /^https?:\/\/(?:www\.)?youtube\.com\/playlist\?(?:.*&)?list=([\w-]+)(?:[&#].*)?$/i;

export function detectPlatform(url: string): Platform {
  const trimmed = url.trim();
  if (!trimmed) return "unknown";
  if (SPOTIFY_RE.test(trimmed)) return "spotify";
  if (
    YOUTUBE_WATCH_RE.test(trimmed) ||
    YOUTUBE_SHORT_RE.test(trimmed) ||
    YOUTUBE_PLAYLIST_RE.test(trimmed)
  ) {
    return "youtube";
  }
  return "unknown";
}

export function buildEmbedUrl(url: string, platform: Platform): string {
  const trimmed = url.trim();
  if (platform === "spotify") {
    const m = SPOTIFY_RE.exec(trimmed);
    if (!m) return "";
    return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
  }
  if (platform === "youtube") {
    const watch = YOUTUBE_WATCH_RE.exec(trimmed);
    if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
    const short = YOUTUBE_SHORT_RE.exec(trimmed);
    if (short) return `https://www.youtube.com/embed/${short[1]}`;
    const list = YOUTUBE_PLAYLIST_RE.exec(trimmed);
    if (list) return `https://www.youtube.com/embed/videoseries?list=${list[1]}`;
    return "";
  }
  return "";
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isPlatform(value: unknown): value is Platform {
  return value === "spotify" || value === "youtube" || value === "unknown";
}

function parseTracks(raw: string | null): PlaylistTrack[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: PlaylistTrack[] = [];
    for (const value of parsed) {
      if (!value || typeof value !== "object") continue;
      const entry = value as Record<string, unknown>;
      const id = entry.id;
      const title = entry.title;
      const url = entry.url;
      const platform = entry.platform;
      const embedUrl = entry.embedUrl;
      const addedAt = entry.addedAt;
      const nowPlaying = entry.nowPlaying;
      if (
        typeof id === "string" &&
        typeof title === "string" &&
        typeof url === "string" &&
        isPlatform(platform) &&
        typeof embedUrl === "string" &&
        typeof addedAt === "string"
      ) {
        out.push({
          id,
          title,
          url,
          platform,
          embedUrl,
          addedAt,
          nowPlaying: typeof nowPlaying === "boolean" ? nowPlaying : false,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function getTracks(): PlaylistTrack[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    return parseTracks(storage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function dispatchChange(newValue: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(
      new CustomEvent(PLAYLIST_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeTracks(next: PlaylistTrack[]): void {
  const storage = safeStorage();
  if (!storage) return;
  const value = JSON.stringify(next);
  try {
    storage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
  dispatchChange(value);
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function addTrack(input: {
  title: string;
  url: string;
}): PlaylistTrack | null {
  const title = input.title.trim();
  const url = input.url.trim();
  if (!title || !url) return null;
  const platform = detectPlatform(url);
  if (platform === "unknown") return null;
  const embedUrl = buildEmbedUrl(url, platform);
  if (!embedUrl) return null;
  const track: PlaylistTrack = {
    id: newId(),
    title: title.slice(0, 200),
    url,
    platform,
    embedUrl,
    addedAt: new Date().toISOString(),
    nowPlaying: false,
  };
  const current = getTracks();
  current.unshift(track);
  writeTracks(current);
  return track;
}

export function deleteTrack(id: string): void {
  if (!id) return;
  const current = getTracks();
  const next = current.filter((t) => t.id !== id);
  if (next.length === current.length) return;
  writeTracks(next);
}

export function setNowPlaying(id: string | null): void {
  const current = getTracks();
  let changed = false;
  const next: PlaylistTrack[] = current.map((t) => {
    const shouldPlay = id !== null && t.id === id;
    if (t.nowPlaying === shouldPlay) return t;
    changed = true;
    return { ...t, nowPlaying: shouldPlay };
  });
  if (!changed) return;
  writeTracks(next);
}
