"use client";

import { useMemo, useState } from "react";
import { Download, Search, ImageOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { openAvatarLightbox } from "@/components/avatar-lightbox";

export type IllustrationItem = {
  name: string;
  src: string;
  category: string;
};

export type AvatarItem = {
  id: number;
  name: string;
  role: string;
  src: string;
};

export function GalleryGrid({
  illustrations,
  avatars,
}: {
  illustrations: IllustrationItem[];
  avatars: AvatarItem[];
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filteredIllustrations = useMemo(() => {
    if (!q) return illustrations;
    return illustrations.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [illustrations, q]);

  const filteredAvatars = useMemo(() => {
    if (!q) return avatars;
    return avatars.filter((a) => a.name.toLowerCase().includes(q));
  }, [avatars, q]);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên file hoặc tên nhân viên..."
          className="pl-9"
          type="search"
        />
      </div>

      <details open className="rounded-xl border bg-card shadow-sm">
        <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-6 py-4 font-semibold">
          <span>Minh họa hệ thống</span>
          <Badge variant="secondary">{filteredIllustrations.length}</Badge>
        </summary>
        <div className="border-t p-6">
          {filteredIllustrations.length === 0 ? (
            <EmptyHint label="Không có minh họa khớp tìm kiếm." />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredIllustrations.map((item) => (
                <IllustrationTile key={item.src} item={item} />
              ))}
            </div>
          )}
        </div>
      </details>

      <details open className="rounded-xl border bg-card shadow-sm">
        <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-6 py-4 font-semibold">
          <span>Avatar nhân viên</span>
          <Badge variant="secondary">{filteredAvatars.length}</Badge>
        </summary>
        <div className="border-t p-6">
          {filteredAvatars.length === 0 ? (
            <EmptyHint label="Không có avatar khớp tìm kiếm." />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredAvatars.map((item) => (
                <AvatarTile key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <ImageOff className="size-6" />
      <span>{label}</span>
    </div>
  );
}

function Tile({
  src,
  alt,
  title,
  subtitle,
  downloadName,
  onClick,
}: {
  src: string;
  alt: string;
  title: string;
  subtitle?: string;
  downloadName: string;
  onClick: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-muted/40">
      <button
        type="button"
        onClick={onClick}
        className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Xem ${title}`}
      >
        <div className="relative aspect-square w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="size-full max-h-[200px] object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </button>
      <a
        href={src}
        download={downloadName}
        onClick={(e) => e.stopPropagation()}
        title={`Tải ${downloadName}`}
        aria-label={`Tải ${downloadName}`}
        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-card/90 text-foreground opacity-0 shadow ring-1 ring-border backdrop-blur transition-opacity hover:bg-accent group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Download className="size-4" />
      </a>
      <div className="px-2 py-1.5 text-xs">
        <div className="truncate font-medium" title={title}>
          {title}
        </div>
        {subtitle && (
          <div className="truncate text-[10px] text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

function IllustrationTile({ item }: { item: IllustrationItem }) {
  return (
    <Tile
      src={item.src}
      alt={item.name}
      title={item.name}
      subtitle={item.category}
      downloadName={item.name}
      onClick={() =>
        openAvatarLightbox({
          src: item.src,
          name: item.name,
        })
      }
    />
  );
}

function AvatarTile({ item }: { item: AvatarItem }) {
  const downloadName = `${item.name.replace(/\s+/g, "_")}.png`;
  return (
    <Tile
      src={item.src}
      alt={item.name}
      title={item.name}
      subtitle={item.role}
      downloadName={downloadName}
      onClick={() =>
        openAvatarLightbox({
          src: item.src,
          name: item.name,
          role: item.role,
          href: `/employees/${item.id}`,
        })
      }
    />
  );
}
