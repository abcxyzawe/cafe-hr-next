"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Clipboard,
  ClipboardCheck,
  Star,
  X,
  Clock,
  UserPlus,
  UserMinus,
  Sparkles,
  Pencil,
  LogIn,
  LogOut,
  CalendarPlus,
  CalendarMinus,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import {
  STORAGE_KEY as STARRED_STORAGE_KEY,
  isStarred as readIsStarred,
  toggleStar,
} from "@/lib/starred-entities";

export type AuditIconName =
  | "clock"
  | "user-plus"
  | "user-minus"
  | "sparkles"
  | "pencil"
  | "login"
  | "logout"
  | "calendar-plus"
  | "calendar-minus";

const ICON_BY_NAME: Record<
  AuditIconName,
  React.ComponentType<{ className?: string }>
> = {
  clock: Clock,
  "user-plus": UserPlus,
  "user-minus": UserMinus,
  sparkles: Sparkles,
  pencil: Pencil,
  login: LogIn,
  logout: LogOut,
  "calendar-plus": CalendarPlus,
  "calendar-minus": CalendarMinus,
};

type AuditUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export type AuditRowData = {
  id: number;
  action: string;
  createdAt: Date;
  entityType: string | null;
  entityId: number | null;
  user: AuditUser | null;
  metadata: Prisma.JsonValue;
};

type Props = {
  row: AuditRowData;
  iconName: AuditIconName;
  accentClass: string;
  summaryNode: React.ReactNode;
  /**
   * When true, the parent (`AuditPage`) only wants to show rows whose
   * entity is currently starred. The row hides itself client-side by
   * setting `display: none` when not starred.
   */
  starredOnly?: boolean;
};

const ENTITY_HREF: Record<string, (id: number) => string> = {
  employee: (id) => `/employees/${id}`,
  shift: () => `/shifts`,
  leave: () => `/leave`,
  task: () => `/tasks`,
  payroll: () => `/payroll`,
  attendance: () => `/attendance`,
};

function getRelativeTime(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const absSec = Math.round(Math.abs(diffMs) / 1000);
  const sign = diffMs < 0 ? -1 : 1;
  const rtf = new Intl.RelativeTimeFormat("vi-VN", { numeric: "auto" });
  if (absSec < 60) return rtf.format(sign * absSec, "second");
  const absMin = Math.round(absSec / 60);
  if (absMin < 60) return rtf.format(sign * absMin, "minute");
  const absHour = Math.round(absMin / 60);
  if (absHour < 24) return rtf.format(sign * absHour, "hour");
  const absDay = Math.round(absHour / 24);
  if (absDay < 30) return rtf.format(sign * absDay, "day");
  const absMonth = Math.round(absDay / 30);
  if (absMonth < 12) return rtf.format(sign * absMonth, "month");
  return rtf.format(sign * Math.round(absMonth / 12), "year");
}

function renderEntityLink(
  entityType: string | null,
  entityId: number | null,
): React.ReactNode {
  if (!entityType) return "—";
  const label = entityId !== null ? `${entityType}#${entityId}` : entityType;
  if (entityId !== null) {
    const builder = ENTITY_HREF[entityType];
    if (builder) {
      return (
        <Link href={builder(entityId)} className="hover:underline">
          {label}
        </Link>
      );
    }
  }
  return <span>{label}</span>;
}

export function AuditRow({
  row,
  iconName,
  accentClass,
  summaryNode,
  starredOnly = false,
}: Props) {
  const Icon = ICON_BY_NAME[iconName] ?? Clock;
  const [expanded, setExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  // Whether *this* row's entity is starred. Mirrors localStorage and stays
  // in sync via the `storage` event (cross-tab + same-tab dispatch from
  // `toggleStar`).
  const [starred, setStarred] = React.useState(false);

  const canStar = row.entityType !== null && row.entityId !== null;

  React.useEffect(() => {
    if (!canStar || row.entityType === null || row.entityId === null) return;
    setStarred(readIsStarred(row.entityType, row.entityId));
    function onStorage(ev: StorageEvent) {
      if (ev.key !== null && ev.key !== STARRED_STORAGE_KEY) return;
      if (row.entityType === null || row.entityId === null) return;
      setStarred(readIsStarred(row.entityType, row.entityId));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [canStar, row.entityType, row.entityId]);

  const onToggleStar = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (row.entityType === null || row.entityId === null) return;
      const next = toggleStar(row.entityType, row.entityId);
      setStarred(next);
    },
    [row.entityType, row.entityId],
  );

  const metadataJson = React.useMemo(
    () => JSON.stringify(row.metadata ?? null, null, 2),
    [row.metadata],
  );

  const toggle = React.useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    },
    [toggle],
  );

  const onCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(metadataJson);
      setCopied(true);
      toast.success("Đã sao chép JSON vào clipboard");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không thể sao chép. Trình duyệt không hỗ trợ.");
    }
  }, [metadataJson]);

  const isoCreated = row.createdAt.toISOString();
  const relative = getRelativeTime(row.createdAt);

  // When the page is in "starred only" mode and this row is not starred
  // (or has no entity to star), hide it client-side. We render+hide rather
  // than skip so the star toggle stays reactive without a server roundtrip.
  const hidden = starredOnly && !starred;
  const hiddenStyle: React.CSSProperties | undefined = hidden
    ? { display: "none" }
    : undefined;

  return (
    <>
      <TableRow
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`audit-detail-${row.id}`}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className="cursor-pointer"
        style={hiddenStyle}
        aria-hidden={hidden ? true : undefined}
      >
        <TableCell>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex size-4 items-center justify-center text-muted-foreground"
              aria-hidden
            >
              {expanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </span>
            <div
              className={`flex size-8 items-center justify-center rounded-full ${accentClass}`}
            >
              <Icon className="size-4" />
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-mono text-[11px]">
            {row.action}
          </Badge>
        </TableCell>
        <TableCell className="max-w-[420px] text-sm">
          <span className="line-clamp-2">{summaryNode}</span>
        </TableCell>
        <TableCell>
          {row.user ? (
            <div className="flex items-center gap-2">
              <Avatar fallback={row.user.name} size={24} />
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-medium">
                  {row.user.name}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {row.user.role === "admin" ? "Admin" : "Staff"} ·{" "}
                  {row.user.email}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Hệ thống</span>
          )}
        </TableCell>
        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 truncate">
              {renderEntityLink(row.entityType, row.entityId)}
            </span>
            {canStar && (
              <button
                type="button"
                onClick={onToggleStar}
                aria-pressed={starred}
                aria-label={starred ? "Bỏ sao đối tượng này" : "Đánh sao đối tượng này"}
                title={starred ? "Bỏ sao" : "Đánh sao"}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 aria-pressed:text-amber-500"
              >
                <Star
                  className="size-3.5"
                  fill={starred ? "currentColor" : "none"}
                  strokeWidth={starred ? 1.5 : 2}
                />
              </button>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
          {formatDateTime(row.createdAt)}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow
          id={`audit-detail-${row.id}`}
          className="bg-muted/30 hover:bg-muted/30"
          style={hiddenStyle}
          aria-hidden={hidden ? true : undefined}
        >
          <TableCell colSpan={6} className="p-0">
            <div className="space-y-3 px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Thời gian tạo
                  </div>
                  <div className="mt-1 font-mono text-xs text-foreground">
                    {isoCreated}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {relative} · {formatDateTime(row.createdAt)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Đối tượng
                  </div>
                  <div className="mt-1 text-xs">
                    {row.entityType ? (
                      <>
                        <span className="text-muted-foreground">Loại: </span>
                        <span className="font-mono">{row.entityType}</span>
                        {row.entityId !== null && (
                          <>
                            {" · "}
                            <span className="text-muted-foreground">ID: </span>
                            <span className="font-mono">{row.entityId}</span>
                            {" · "}
                            {renderEntityLink(row.entityType, row.entityId)}
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        Không gắn với đối tượng nào
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Metadata
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onCopy();
                      }}
                    >
                      {copied ? (
                        <ClipboardCheck className="size-3.5" />
                      ) : (
                        <Clipboard className="size-3.5" />
                      )}
                      Sao chép JSON
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(false);
                      }}
                    >
                      <X className="size-3.5" />
                      Đóng
                    </Button>
                  </div>
                </div>
                <pre className="max-h-80 overflow-auto rounded-md border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">
                  {metadataJson}
                </pre>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
