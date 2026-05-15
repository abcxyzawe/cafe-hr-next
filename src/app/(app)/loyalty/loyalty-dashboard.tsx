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
  Crown,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  LOYALTY_EVENT,
  STORAGE_KEY,
  addCustomer,
  deleteCustomer,
  getCustomers,
  recordVisit,
  updateCustomer,
} from "@/lib/loyalty-state";
import {
  TIER_BADGES,
  TIER_LABELS,
  TIER_OPTIONS,
  TIER_TINTS,
  type LoyaltyCustomer,
  type LoyaltyTier,
} from "@/lib/loyalty-types";

type FormState = {
  name: string;
  phone: string;
  notes: string;
  tier: LoyaltyTier;
};

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  notes: "",
  tier: "regular",
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Chưa có lượt ghé";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Chưa có lượt ghé";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} ${dd}/${mo}/${d.getFullYear()}`;
}

function csvEscape(field: string): string {
  if (/[",\n\r]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function buildCsv(customers: ReadonlyArray<LoyaltyCustomer>): string {
  const header = [
    "name",
    "phone",
    "tier",
    "visitCount",
    "lastVisit",
    "createdAt",
    "notes",
  ];
  const lines = [header.join(",")];
  for (const c of customers) {
    lines.push(
      [
        csvEscape(c.name),
        csvEscape(c.phone),
        csvEscape(TIER_LABELS[c.tier]),
        String(c.visitCount),
        csvEscape(c.lastVisit ?? ""),
        csvEscape(c.createdAt),
        csvEscape(c.notes),
      ].join(","),
    );
  }
  return lines.join("\n");
}

function downloadCsv(csv: string, filename: string): void {
  if (typeof window === "undefined") return;
  try {
    const blob = new Blob([`\ufeff${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

export function LoyaltyDashboard() {
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    setCustomers(getCustomers());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setCustomers(getCustomers());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOYALTY_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOYALTY_EVENT, onCustom);
    };
  }, [hydrated]);

  const sorted = useMemo(() => {
    const copy = customers.slice();
    copy.sort((a, b) => {
      if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
      return a.name.localeCompare(b.name, "vi");
    });
    return copy;
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
      );
    });
  }, [sorted, search]);

  const totalCustomers = customers.length;
  const totalVisits = useMemo(
    () => customers.reduce((acc, c) => acc + c.visitCount, 0),
    [customers],
  );
  const topThree = useMemo(() => sorted.slice(0, 3), [sorted]);

  const handleAddSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!addForm.name.trim()) return;
      addCustomer({
        name: addForm.name,
        phone: addForm.phone,
        notes: addForm.notes,
        tier: addForm.tier,
      });
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
    },
    [addForm],
  );

  const startEdit = useCallback((c: LoyaltyCustomer) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name,
      phone: c.phone,
      notes: c.notes,
      tier: c.tier,
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  }, []);

  const handleEditSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!editingId) return;
      if (!editForm.name.trim()) return;
      updateCustomer(editingId, {
        name: editForm.name,
        phone: editForm.phone,
        notes: editForm.notes,
        tier: editForm.tier,
      });
      cancelEdit();
    },
    [editingId, editForm, cancelEdit],
  );

  const handleDelete = useCallback((c: LoyaltyCustomer) => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(`Xoá khách "${c.name}"?`);
    if (!ok) return;
    deleteCustomer(c.id);
  }, []);

  const handleRecordVisit = useCallback((id: string) => {
    recordVisit(id);
  }, []);

  const handleExport = useCallback(() => {
    const csv = buildCsv(sorted);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `loyalty-${stamp}.csv`);
  }, [sorted]);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const topCustomerName = topThree[0]?.name ?? "—";

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm theo tên hoặc số điện thoại…"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            className="pl-8"
            aria-label="Tìm khách hàng"
          />
        </div>
        <Button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          aria-expanded={showAddForm}
        >
          {showAddForm ? <X className="size-4" /> : <UserPlus className="size-4" />}
          {showAddForm ? "Đóng" : "Thêm khách"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleExport}
          disabled={customers.length === 0}
        >
          <Download className="size-4" />
          Xuất CSV
        </Button>
      </div>

      {/* Add form */}
      {showAddForm ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thêm khách mới</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm
              value={addForm}
              onChange={setAddForm}
              onSubmit={handleAddSubmit}
              submitLabel="Lưu khách"
              submitIcon={<Plus className="size-4" />}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Users className="size-5" />}
          label="Tổng khách"
          value={String(totalCustomers)}
        />
        <StatCard
          icon={<Plus className="size-5" />}
          label="Tổng lượt ghé"
          value={String(totalVisits)}
        />
        <StatCard
          icon={<Crown className="size-5" />}
          label="Top khách"
          value={topCustomerName}
        />
      </div>

      {/* Top 3 */}
      {topThree.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 3 khách quen</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1.5 text-sm">
              {topThree.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="truncate font-medium">{c.name}</span>
                    <TierBadge tier={c.tier} />
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {c.visitCount} lượt
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {/* Customer list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {customers.length === 0
                ? "Chưa có khách nào — bấm “Thêm khách” để bắt đầu."
                : "Không tìm thấy khách phù hợp."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) =>
            editingId === c.id ? (
              <Card key={c.id} className={cn(TIER_TINTS[c.tier])}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Sửa khách: {c.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomerForm
                    value={editForm}
                    onChange={setEditForm}
                    onSubmit={handleEditSubmit}
                    submitLabel="Cập nhật"
                    submitIcon={<Pencil className="size-4" />}
                    onCancel={cancelEdit}
                  />
                </CardContent>
              </Card>
            ) : (
              <CustomerRow
                key={c.id}
                customer={c}
                onRecordVisit={handleRecordVisit}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold tracking-tight">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TierBadge({ tier }: { tier: LoyaltyTier }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        TIER_BADGES[tier],
      )}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}

type CustomerRowProps = {
  customer: LoyaltyCustomer;
  onRecordVisit: (id: string) => void;
  onEdit: (c: LoyaltyCustomer) => void;
  onDelete: (c: LoyaltyCustomer) => void;
};

function CustomerRow({
  customer,
  onRecordVisit,
  onEdit,
  onDelete,
}: CustomerRowProps) {
  return (
    <Card className={cn(TIER_TINTS[customer.tier])}>
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold tracking-tight">
              {customer.name}
            </h3>
            <TierBadge tier={customer.tier} />
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {customer.visitCount} lượt
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {customer.phone ? (
              <span>SĐT: {customer.phone}</span>
            ) : (
              <span>Không có SĐT</span>
            )}
            <span>Ghé lần cuối: {formatTimestamp(customer.lastVisit)}</span>
          </div>
          {customer.notes ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {customer.notes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={() => onRecordVisit(customer.id)}
          >
            <Plus className="size-3.5" />
            Ghi nhận lượt ghé
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(customer)}
          >
            <Pencil className="size-3.5" />
            Sửa
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDelete(customer)}
            className="text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            <Trash2 className="size-3.5" />
            Xoá
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type CustomerFormProps = {
  value: FormState;
  onChange: (next: FormState) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  submitIcon: React.ReactNode;
  onCancel?: () => void;
};

function CustomerForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  submitIcon,
  onCancel,
}: CustomerFormProps) {
  const disabled = value.name.trim() === "";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="loyalty-name"
          >
            Tên khách <span className="text-rose-600">*</span>
          </label>
          <Input
            id="loyalty-name"
            type="text"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="VD: Anh Tuấn"
            required
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="loyalty-phone"
          >
            Số điện thoại
          </label>
          <Input
            id="loyalty-phone"
            type="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            placeholder="VD: 0901234567"
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="loyalty-tier"
          >
            Hạng khách
          </label>
          <Select
            id="loyalty-tier"
            value={value.tier}
            onChange={(e) =>
              onChange({ ...value, tier: e.target.value as LoyaltyTier })
            }
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TIER_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="loyalty-notes"
          >
            Ghi chú
          </label>
          <Input
            id="loyalty-notes"
            type="text"
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            placeholder="VD: Thích cà phê sữa đá ít đường"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={disabled}>
          {submitIcon}
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Huỷ
          </Button>
        ) : null}
      </div>
    </form>
  );
}
