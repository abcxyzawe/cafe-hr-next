"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type InlineTextSaveResult = { ok: boolean; error?: string };

export function InlineTextEdit({
  value,
  placeholder = "—",
  onSave,
  validate,
  editable = true,
  className,
  inputClassName,
  ariaLabel,
}: {
  value: string | null;
  placeholder?: string;
  onSave: (newValue: string | null) => Promise<InlineTextSaveResult>;
  validate?: (v: string) => string | null;
  editable?: boolean;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  // Optimistic local copy of the saved value (mirrors prop unless overridden)
  const [committed, setCommitted] = useState<string | null>(value);
  const [draft, setDraft] = useState<string>(value ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  // Guard so blur handler doesn't double-fire after Enter/Esc
  const finishedRef = useRef(false);

  // Re-sync if parent value changes (e.g. server revalidation)
  useEffect(() => {
    setCommitted(value);
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      finishedRef.current = false;
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [editing]);

  function commit() {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const trimmed = draft.trim();
    const next: string | null = trimmed === "" ? null : trimmed;

    if (next === committed) {
      setEditing(false);
      return;
    }

    if (next !== null && validate) {
      const err = validate(next);
      if (err) {
        toast.error(err);
        // Stay in editing mode so user can fix
        finishedRef.current = false;
        inputRef.current?.focus();
        return;
      }
    }

    const previous = committed;
    // Optimistic update
    setCommitted(next);
    setEditing(false);

    startTransition(async () => {
      const res = await onSave(next);
      if (res.ok) {
        toast.success("Đã cập nhật");
      } else {
        // Revert
        setCommitted(previous);
        setDraft(previous ?? "");
        toast.error(res.error || "Không cập nhật được");
      }
    });
  }

  function cancel() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setDraft(committed ?? "");
    setEditing(false);
  }

  if (!editable) {
    return (
      <span className={cn("inline-block", className)}>
        {committed || placeholder}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(committed ?? "");
          setEditing(true);
        }}
        className={cn(
          "group/edit inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-accent",
          !committed && "text-muted-foreground",
          className,
        )}
        title="Click để sửa"
        aria-label={ariaLabel ? `Sửa ${ariaLabel}` : undefined}
      >
        <span className="truncate">
          {committed || placeholder}
        </span>
        {pending ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100" />
        )}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={draft}
      placeholder={placeholder}
      disabled={pending}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      }}
      onBlur={commit}
      className={cn("h-7 px-2 py-0.5 text-sm", inputClassName)}
    />
  );
}
