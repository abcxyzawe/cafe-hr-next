"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tất cả vai trò" },
  { value: "barista", label: "Pha chế" },
  { value: "server", label: "Phục vụ" },
  { value: "cashier", label: "Thu ngân" },
  { value: "manager", label: "Quản lý" },
];

export function EmployeeSearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const role = params.get("role") ?? "";

  useEffect(() => {
    const id = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (q) sp.set("q", q);
      else sp.delete("q");
      startTransition(() => {
        router.replace(`/employees?${sp.toString()}`, { scroll: false });
      });
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setRole(v: string) {
    const sp = new URLSearchParams(params.toString());
    if (v) sp.set("role", v);
    else sp.delete("role");
    startTransition(() => {
      router.replace(`/employees?${sp.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative max-w-xs flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên, email, SĐT..."
          className="pl-9 pr-8"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Xoá"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <Select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="max-w-[160px]"
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
