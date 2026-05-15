"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "cafe-hr-profile-bio";
const MAX_LEN = 280;

function readBio(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function ProfileBioCard() {
  const [bio, setBio] = useState("");
  const [draft, setDraft] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const initial = readBio();
    setBio(initial);
    setDraft(initial);
    setHydrated(true);
  }, []);

  function save() {
    if (typeof window === "undefined") return;
    const trimmed = draft.trim().slice(0, MAX_LEN);
    window.localStorage.setItem(STORAGE_KEY, trimmed);
    setBio(trimmed);
    setSavedAt(Date.now());
    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setSavedAt(null), 2000);
  }

  function clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    setBio("");
    setDraft("");
  }

  const dirty = draft.trim() !== bio.trim();
  const remaining = MAX_LEN - draft.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="size-5 text-primary" />
          Giới thiệu bản thân
        </CardTitle>
        <CardDescription>
          Vài dòng về bạn — chỉ lưu trên thiết bị này, không chia sẻ.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          placeholder="VD: Mình là barista, thích pha cold brew và nghe nhạc indie..."
          rows={4}
          maxLength={MAX_LEN}
          disabled={!hydrated}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              "text-xs tabular-nums",
              remaining <= 20
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground",
            )}
          >
            Còn {remaining} ký tự
          </span>
          <div className="flex items-center gap-2">
            {savedAt !== null && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Đã lưu
              </span>
            )}
            {bio.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clear}
                disabled={!hydrated}
              >
                <Trash2 className="size-4" />
                Xoá
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={!hydrated || !dirty}
            >
              <Save className="size-4" />
              Lưu
            </Button>
          </div>
        </div>
        {hydrated && bio.length > 0 && (
          <div className="rounded-md border-l-4 border-primary/40 bg-muted/40 p-3 text-sm leading-relaxed">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Xem trước
            </p>
            <p className="whitespace-pre-wrap text-foreground/90">{bio}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
