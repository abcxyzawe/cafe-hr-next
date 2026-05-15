"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table2, LayoutGrid, Cake, Phone, Mail, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClickableAvatar } from "@/components/avatar-lightbox";
import { ROLE_LABELS, formatVND, formatDate, cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";
import { EmployeesTable } from "./employees-table";
import { InlineRateEdit } from "./inline-rate-edit";

const EMPTY_SPARK: number[] = [0, 0, 0, 0, 0, 0, 0];

type EmployeeRow = {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  hourlyRate: number;
  avatarUrl: string | null;
  dateOfBirth: Date | null;
  createdAt: Date;
};

type ViewMode = "table" | "gallery";
const STORAGE_KEY = "cafe-hr-employees-view";

const ROLE_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning"
> = {
  barista: "default",
  server: "secondary",
  cashier: "warning",
  manager: "success",
};

export function EmployeesView({
  employees,
  isAdmin,
  sparklines,
}: {
  employees: EmployeeRow[];
  isAdmin: boolean;
  sparklines?: Record<number, number[]>;
}) {
  const [view, setView] = useState<ViewMode>("table");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "gallery" || stored === "table") setView(stored);
    setHydrated(true);
  }, []);

  function setViewMode(v: ViewMode) {
    setView(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore
    }
  }

  return (
    <div>
      {/* Toggle bar */}
      <div className="flex justify-end px-4 pt-3 pb-1">
        <div
          className="inline-flex items-center rounded-md border bg-card p-0.5 shadow-sm"
          role="tablist"
          aria-label="Chế độ xem nhân viên"
        >
          <ViewButton
            active={hydrated && view === "table"}
            onClick={() => setViewMode("table")}
            icon={Table2}
            label="Bảng"
          />
          <ViewButton
            active={hydrated && view === "gallery"}
            onClick={() => setViewMode("gallery")}
            icon={LayoutGrid}
            label="Thẻ"
          />
        </div>
      </div>

      {/* Render: gallery only after hydration to avoid flash */}
      {!hydrated || view === "table" ? (
        <EmployeesTable
          employees={employees}
          isAdmin={isAdmin}
          sparklines={sparklines}
        />
      ) : (
        <EmployeesGallery
          employees={employees}
          sparklines={sparklines}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function EmployeesGallery({
  employees,
  sparklines,
  isAdmin,
}: {
  employees: EmployeeRow[];
  sparklines?: Record<number, number[]>;
  isAdmin: boolean;
}) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {employees.map((e) => (
        <EmployeeCard
          key={e.id}
          employee={e}
          sparkline={sparklines?.[e.id] ?? EMPTY_SPARK}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

function EmployeeCard({
  employee,
  sparkline,
  isAdmin,
}: {
  employee: EmployeeRow;
  sparkline: number[];
  isAdmin: boolean;
}) {
  const variant = ROLE_VARIANT[employee.role] ?? "secondary";
  const roleLabel = ROLE_LABELS[employee.role] ?? employee.role;

  return (
    <Card className="group transition-all hover:border-primary/30 hover:shadow-md">
      <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
        <ClickableAvatar
          src={employee.avatarUrl}
          name={employee.name}
          role={employee.role}
          href={`/employees/${employee.id}`}
          size={88}
          className="ring-2 ring-primary/10"
        />
        <div className="min-w-0 space-y-1">
          <Link
            href={`/employees/${employee.id}`}
            className="block truncate font-semibold leading-tight transition-colors hover:text-primary"
            title={employee.name}
            data-employee-id={employee.id}
          >
            {employee.name}
          </Link>
          <Badge variant={variant} className="text-[10px]">
            {roleLabel}
          </Badge>
        </div>

        <div className="w-full space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Banknote className="size-3 shrink-0" />
            <span className="flex items-baseline gap-0.5">
              <InlineRateEdit
                id={employee.id}
                initialRate={employee.hourlyRate}
                canEdit={isAdmin}
              />
              <span className="text-muted-foreground">/giờ</span>
            </span>
          </div>
          {employee.phone && <Row icon={Phone} label={employee.phone} />}
          {employee.email && (
            <Row
              icon={Mail}
              label={employee.email}
              className="overflow-hidden text-ellipsis"
            />
          )}
          {employee.dateOfBirth && (
            <Row
              icon={Cake}
              label={`Sinh ${formatDate(employee.dateOfBirth)}`}
            />
          )}
        </div>

        <div className="flex w-full items-center justify-between gap-2 border-t pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>7 ngày qua</span>
          <Sparkline
            values={sparkline}
            width={80}
            height={20}
            variant="area"
            className="text-primary"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  icon: Icon,
  label,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3 shrink-0" />
      <span className={cn("truncate", className)}>{label}</span>
    </div>
  );
}
