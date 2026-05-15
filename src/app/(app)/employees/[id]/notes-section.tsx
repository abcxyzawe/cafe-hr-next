"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import {
  Loader2,
  MessageSquarePlus,
  Trash2,
  StickyNote,
  Pencil,
  Check,
  X,
  Pin,
  Bold,
  Italic,
  Link2,
  List,
  Quote as QuoteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { VoiceDictateButton } from "@/components/voice-dictate-button";
import { MarkdownText } from "@/lib/markdown-mini";
import {
  createNote,
  deleteNote,
  toggleNotePin,
  updateNote,
  type NoteState,
} from "./notes-actions";

type Note = {
  id: number;
  authorId: number | null;
  authorName: string;
  content: string;
  createdAt: Date;
  pinned: boolean;
};

type MentionItem = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

const initial: NoteState = { ok: false };

function relativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Detects an active "@query" trigger immediately to the left of the caret.
 * Returns null if the previous char is alphanumeric (so emails like
 * a@b don't trigger), or if there's whitespace/newline inside the query.
 */
function detectMentionTrigger(
  value: string,
  caret: number,
): { start: number; query: string } | null {
  // Look for the nearest '@' to the left of the caret.
  let i = caret - 1;
  while (i >= 0) {
    const ch = value[i]!;
    if (ch === "@") {
      // Check the char before '@' — must be start, whitespace, or punctuation.
      const prev = i > 0 ? value[i - 1]! : "";
      if (prev !== "" && /[A-Za-z0-9_]/.test(prev)) return null;
      const query = value.slice(i + 1, caret);
      // Query must not contain whitespace/newline; cap length so we don't
      // try to fetch arbitrarily long strings.
      if (/\s/.test(query)) return null;
      if (query.length > 30) return null;
      return { start: i, query };
    }
    if (/\s/.test(ch)) return null;
    i -= 1;
  }
  return null;
}

type MentionTextareaProps = {
  name?: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  /** Extra keys (e.g. Ctrl+Enter to submit, Esc to cancel). Called only if the dropdown isn't handling the key. */
  onExtraKeyDown?: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  /** Show markdown formatting toolbar above the textarea */
  toolbar?: boolean;
};

type WrapMode = "wrap" | "linePrefix";

function applyMarkdownWrap(
  ta: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string,
  mode: WrapMode = "wrap",
): string {
  const value = ta.value;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = value.slice(start, end);

  if (mode === "linePrefix") {
    // Operate on full lines covered by selection
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd =
      value.indexOf("\n", end) === -1 ? value.length : value.indexOf("\n", end);
    const block = value.slice(lineStart, lineEnd);
    const lines = block.length === 0 ? [placeholder] : block.split("\n");
    const newBlock = lines.map((l) => `${before}${l}`).join("\n");
    const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(lineStart, lineStart + newBlock.length);
    });
    return next;
  }

  const insert = selected.length > 0 ? selected : placeholder;
  const next = value.slice(0, start) + before + insert + after + value.slice(end);
  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + insert.length;
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(cursorStart, cursorEnd);
  });
  return next;
}

function FormatToolbar({
  taRef,
  onChange,
}: {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (next: string) => void;
}) {
  function applyWrap(
    before: string,
    after: string,
    placeholder: string,
    mode: WrapMode = "wrap",
  ) {
    const ta = taRef.current;
    if (!ta) return;
    const next = applyMarkdownWrap(ta, before, after, placeholder, mode);
    onChange(next);
  }

  const tools: Array<{
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
  }> = [
    {
      key: "bold",
      icon: Bold,
      label: "Đậm (Ctrl+B)",
      onClick: () => applyWrap("**", "**", "đậm"),
    },
    {
      key: "italic",
      icon: Italic,
      label: "Nghiêng (Ctrl+I)",
      onClick: () => applyWrap("*", "*", "nghiêng"),
    },
    {
      key: "link",
      icon: Link2,
      label: "Link",
      onClick: () => applyWrap("https://", "", "url"),
    },
    {
      key: "list",
      icon: List,
      label: "Danh sách",
      onClick: () => applyWrap("- ", "", "mục", "linePrefix"),
    },
    {
      key: "quote",
      icon: QuoteIcon,
      label: "Trích dẫn",
      onClick: () => applyWrap("> ", "", "trích dẫn", "linePrefix"),
    },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-input bg-muted/40 p-0.5">
      {tools.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            onClick={t.onClick}
            title={t.label}
            aria-label={t.label}
            className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

function MentionTextarea({
  name,
  value,
  onChange,
  rows = 3,
  maxLength = 2000,
  required,
  autoFocus,
  placeholder,
  className,
  onExtraKeyDown,
  toolbar = false,
}: MentionTextareaProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [trigger, setTrigger] = useState<{ start: number; query: string } | null>(
    null,
  );
  const [items, setItems] = useState<MentionItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSeqRef = useRef(0);

  const open = trigger !== null;

  const closeDropdown = useCallback(() => {
    setTrigger(null);
    setItems([]);
    setActiveIdx(0);
  }, []);

  // Debounced fetch when trigger query changes.
  useEffect(() => {
    if (!trigger) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = trigger.query;
    if (q.length === 0) {
      // No query yet — show empty placeholder state but keep dropdown open.
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const seq = ++fetchSeqRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/employees/lookup?q=${encodeURIComponent(q)}`,
          { credentials: "same-origin" },
        );
        if (!res.ok) {
          if (seq === fetchSeqRef.current) {
            setItems([]);
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as { items: MentionItem[] };
        if (seq === fetchSeqRef.current) {
          setItems(json.items);
          setActiveIdx(0);
          setLoading(false);
        }
      } catch {
        if (seq === fetchSeqRef.current) {
          setItems([]);
          setLoading(false);
        }
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trigger]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    onChange(next);
    const caret = e.target.selectionStart ?? next.length;
    const t = detectMentionTrigger(next, caret);
    setTrigger(t);
    if (!t) {
      setItems([]);
      setActiveIdx(0);
    }
  }

  function insertMention(item: MentionItem) {
    const ta = taRef.current;
    if (!ta || !trigger) return;
    const caret = ta.selectionStart ?? value.length;
    // Replace from `@` start through current caret with the marker.
    const before = value.slice(0, trigger.start);
    const after = value.slice(caret);
    const marker = `@[${item.name}](${item.id}) `;
    const next = before + marker + after;
    onChange(next);
    closeDropdown();
    // Restore caret after the inserted marker (and trailing space).
    const newCaret = before.length + marker.length;
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(newCaret, newCaret);
    });
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (open && items.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % items.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + items.length) % items.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const item = items[activeIdx];
        if (item) insertMention(item);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeDropdown();
        return;
      }
    } else if (open && e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      return;
    }
    onExtraKeyDown?.(e);
  }

  function handleSelect() {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? 0;
    const t = detectMentionTrigger(value, caret);
    setTrigger(t);
    if (!t) {
      setItems([]);
      setActiveIdx(0);
    }
  }

  function handleToolbarKey(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (toolbar && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === "b" || key === "i") {
        e.preventDefault();
        const ta = taRef.current;
        if (ta) {
          const wrap = key === "b" ? "**" : "*";
          const placeholder = key === "b" ? "đậm" : "nghiêng";
          const next = applyMarkdownWrap(ta, wrap, wrap, placeholder, "wrap");
          onChange(next);
        }
      }
    }
  }

  return (
    <div className="space-y-1.5">
      {toolbar && (
        <FormatToolbar taRef={taRef} onChange={onChange} />
      )}
      <div className="relative">
      <textarea
        ref={taRef}
        name={name}
        required={required}
        autoFocus={autoFocus}
        maxLength={maxLength}
        rows={rows}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          handleToolbarKey(e);
          if (e.defaultPrevented) return;
          handleKeyDown(e);
        }}
        onSelect={handleSelect}
        onBlur={() => {
          // Defer so click on a dropdown item still registers.
          window.setTimeout(closeDropdown, 120);
        }}
        placeholder={placeholder}
        className={className}
      />
      <div className="absolute bottom-2 right-2 z-10">
        <VoiceDictateButton
          onTranscript={(text) => {
            const ta = taRef.current;
            const sep = value.length > 0 && !/\s$/.test(value) ? " " : "";
            const next = value + sep + text;
            onChange(next);
            // Restore focus + caret to end after dictation
            requestAnimationFrame(() => {
              if (ta) {
                ta.focus();
                ta.setSelectionRange(next.length, next.length);
              }
            });
          }}
        />
      </div>
      {open ? (
        <div
          role="listbox"
          aria-label="Gợi ý nhân viên"
          className="absolute left-0 top-full z-50 mt-1 max-h-60 w-72 overflow-y-auto rounded-md border bg-popover shadow-xl"
        >
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Đang tìm…
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {trigger && trigger.query.length === 0
                ? "Gõ tên nhân viên…"
                : "Không tìm thấy nhân viên"}
            </div>
          ) : (
            <ul className="py-1">
              {items.map((item, idx) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // Prevent textarea blur before click fires.
                      e.preventDefault();
                    }}
                    onClick={() => insertMention(item)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                      idx === activeIdx
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <Avatar
                      src={item.avatarUrl}
                      fallback={item.name}
                      size={24}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{item.name}</span>
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {item.role}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      </div>
    </div>
  );
}

export function NotesSection({
  employeeId,
  notes,
  currentUserId,
  isAdmin,
}: {
  employeeId: number;
  notes: Note[];
  currentUserId: number;
  isAdmin: boolean;
}) {
  const action = createNote.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(action, initial);
  const ref = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    if (state.ok) {
      toast.success("Đã lưu ghi chú");
      ref.current?.reset();
      setDraft("");
      setMode("edit");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="space-y-4">
      <form ref={ref} action={formAction} className="space-y-2">
        <div className="flex items-center gap-1 rounded-md border border-input bg-muted/30 p-0.5 text-xs w-fit">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`rounded px-2 py-1 transition-colors ${
              mode === "edit"
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Soạn
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`rounded px-2 py-1 transition-colors ${
              mode === "preview"
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Xem trước
          </button>
        </div>

        {mode === "edit" ? (
          <MentionTextarea
            name="content"
            required
            maxLength={2000}
            rows={3}
            value={draft}
            onChange={setDraft}
            toolbar
            placeholder="Thêm ghi chú về nhân viên này... Gõ @ để nhắc · Ctrl+B/I để định dạng"
            className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : (
          <>
            <input type="hidden" name="content" value={draft} />
            <div className="min-h-[5.5rem] rounded-md border border-input bg-muted/20 px-3 py-2">
              {draft.trim().length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Chưa có nội dung để xem trước.
                </p>
              ) : (
                <MarkdownText text={draft} />
              )}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Hỗ trợ <strong className="font-semibold">**đậm**</strong>,{" "}
          <em className="italic">*nghiêng*</em>, xuống dòng, link tự động và{" "}
          <span className="font-medium text-primary">@nhắc tên</span>
        </p>

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="size-4" />
            )}
            Lưu ghi chú
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30">
          <EmptyState
            illustration="/illustrations/empty-notes.png"
            icon={StickyNote}
            title="Chưa có ghi chú"
            description="Thêm ghi chú đầu tiên ở form phía trên."
            size="sm"
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <NoteItem
              key={n.id}
              note={n}
              canModify={isAdmin || n.authorId === currentUserId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteItem({
  note,
  canModify,
}: {
  note: Note;
  canModify: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [pending, startTransition] = useTransition();

  function commitEdit() {
    if (draft.trim().length === 0) {
      toast.error("Ghi chú không được trống");
      return;
    }
    if (draft === note.content) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await updateNote(note.id, draft);
      if (res.ok) {
        toast.success("Đã cập nhật ghi chú");
        setEditing(false);
      } else {
        toast.error(res.error || "Không cập nhật được");
      }
    });
  }

  function cancelEdit() {
    setDraft(note.content);
    setEditing(false);
  }

  return (
    <li
      className={`group flex gap-3 rounded-lg border p-3 ${
        note.pinned
          ? "border-l-4 border-l-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
          : "bg-card/40"
      }`}
    >
      <Avatar fallback={note.authorName} size={32} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-xs">
          <span className="font-semibold">{note.authorName}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{relativeTime(note.createdAt)}</span>
          {note.pinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
              <Pin className="size-2.5 fill-current" />
              Ghim
            </span>
          )}
        </div>
        {editing ? (
          <div className="mt-2 space-y-2">
            <MentionTextarea
              autoFocus
              value={draft}
              onChange={setDraft}
              onExtraKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  commitEdit();
                }
              }}
              rows={3}
              maxLength={2000}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                ⌘/Ctrl + Enter để lưu · Esc để huỷ
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                  disabled={pending}
                >
                  <X className="size-3.5" />
                  Huỷ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={commitEdit}
                  disabled={pending || draft.trim().length === 0}
                >
                  {pending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Lưu
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <MarkdownText text={note.content} />
          </div>
        )}
      </div>
      {canModify && !editing && (
        <div
          className={`flex items-start gap-0.5 transition-opacity ${
            note.pinned
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          }`}
        >
          <PinNoteButton id={note.id} pinned={note.pinned} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setEditing(true)}
            title="Sửa ghi chú"
            aria-label="Sửa ghi chú"
          >
            <Pencil className="size-4" />
          </Button>
          <DeleteNoteButton id={note.id} />
        </div>
      )}
    </li>
  );
}

function PinNoteButton({ id, pinned }: { id: number; pinned: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      title={pinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú"}
      aria-label={pinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú"}
      aria-pressed={pinned}
      onClick={() => {
        startTransition(async () => {
          const res = await toggleNotePin(id);
          if (res.ok) {
            toast.success(res.pinned ? "Đã ghim ghi chú" : "Đã bỏ ghim ghi chú");
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Pin
          className={`size-4 ${
            pinned ? "fill-amber-400 text-amber-500" : "text-muted-foreground"
          }`}
        />
      )}
    </Button>
  );
}

function DeleteNoteButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      title="Xoá ghi chú"
      aria-label="Xoá ghi chú"
      onClick={() => {
        if (!confirm("Xoá ghi chú này?")) return;
        startTransition(async () => {
          try {
            await deleteNote(id);
            toast.success("Đã xoá ghi chú");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Lỗi");
          }
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4 text-destructive" />
      )}
    </Button>
  );
}
