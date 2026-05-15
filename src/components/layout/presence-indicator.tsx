"use client";

import { useEffect, useRef, useState } from "react";
import { Users, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ActiveUser = {
  uid: number;
  name: string;
  email: string;
  role: "admin" | "staff";
  ageMs: number;
};

export function PresenceIndicator({ currentUid }: { currentUid: number }) {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Subscribe to presence stream
  useEffect(() => {
    const es = new EventSource("/api/presence/stream");
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { users: ActiveUser[] };
        setUsers(data.users);
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, []);

  // Heartbeat every 30s as a safety net (stream itself also keeps us alive)
  useEffect(() => {
    const ping = () => {
      fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const others = users.filter((u) => u.uid !== currentUid);
  if (users.length <= 1) {
    // Show a subtle "1 online" dot only when alone — quieter UI
    return (
      <div
        className="hidden items-center gap-1.5 rounded-full border bg-card/50 px-2 py-1 text-[10px] text-muted-foreground md:inline-flex"
        title="Chỉ có bạn đang online"
      >
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        Chỉ mình bạn
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border bg-card px-2 py-1 text-xs shadow-sm transition-colors hover:bg-accent"
        title={`${users.length} người đang online`}
      >
        <div className="flex -space-x-2">
          {users.slice(0, 3).map((u) => (
            <Avatar
              key={u.uid}
              fallback={u.name}
              alt={u.name}
              size={20}
              className={cn(
                "ring-2 ring-card",
                u.uid === currentUid && "ring-primary",
              )}
            />
          ))}
        </div>
        <span className="hidden font-medium sm:inline">{users.length}</span>
        {users.length > 3 && (
          <span className="text-muted-foreground">+{users.length - 3}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border bg-popover p-1 shadow-xl">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Users className="size-3.5 text-muted-foreground" />
            <p className="text-sm font-semibold">
              Đang online ({users.length})
            </p>
          </div>
          <ul className="max-h-72 overflow-y-auto p-1">
            {others.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                Hiện chỉ có bạn đang online
              </li>
            ) : (
              others.map((u) => (
                <li
                  key={u.uid}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <div className="relative">
                    <Avatar fallback={u.name} alt={u.name} size={24} />
                    <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-popover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{u.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                  {u.role === "admin" && (
                    <ShieldCheck className="size-3 text-primary" />
                  )}
                </li>
              ))
            )}
          </ul>
          <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Cập
              nhật real-time
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
