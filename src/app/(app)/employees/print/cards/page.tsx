import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Coffee } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["barista", "server", "cashier", "manager"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

const ROLE_CHIP: Record<string, string> = {
  barista: "border-amber-400 bg-amber-50 text-amber-800",
  server: "border-sky-400 bg-sky-50 text-sky-800",
  cashier: "border-yellow-400 bg-yellow-50 text-yellow-800",
  manager: "border-emerald-400 bg-emerald-50 text-emerald-800",
};

const ROLE_AVATAR_BG: Record<string, string> = {
  barista: "bg-amber-200 text-amber-900",
  server: "bg-sky-200 text-sky-900",
  cashier: "bg-yellow-200 text-yellow-900",
  manager: "bg-emerald-200 text-emerald-900",
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function parseIds(raw: string | undefined): number[] | undefined {
  if (!raw) return undefined;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length ? ids : undefined;
}

export default async function EmployeePrintCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; ids?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const sp = await searchParams;
  const roleFilter: ValidRole | undefined =
    sp.role && (VALID_ROLES as readonly string[]).includes(sp.role)
      ? (sp.role as ValidRole)
      : undefined;
  const idsFilter = parseIds(sp.ids);

  const where: Prisma.EmployeeWhereInput = {};
  if (roleFilter) where.role = roleFilter;
  if (idsFilter) where.id = { in: idsFilter };

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { name: "asc" },
  });

  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";

  const backHref = roleFilter ? `/employees?role=${roleFilter}` : "/employees";

  return (
    <div className="cards-print-root min-h-screen bg-zinc-100 print:min-h-0 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
          <p className="text-sm text-muted-foreground">
            Thẻ nhân viên · 4 thẻ / trang A4 · Ctrl/Cmd+P để in
          </p>
        </div>

        <form
          method="get"
          className="flex flex-wrap items-center gap-2 print:hidden"
        >
          <label
            htmlFor="role-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Lọc vai trò
          </label>
          <select
            id="role-filter"
            name="role"
            defaultValue={roleFilter ?? ""}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Tất cả</option>
            {VALID_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r] ?? r}
              </option>
            ))}
          </select>
          {idsFilter ? (
            <input type="hidden" name="ids" value={idsFilter.join(",")} />
          ) : null}
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Áp dụng
          </button>
          <PrintButton />
        </form>
      </div>

      <main className="mx-auto max-w-[210mm] px-4 py-6 print:max-w-none print:px-0 print:py-0">
        {employees.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500 print:hidden">
            Không có nhân viên nào để in.
          </p>
        ) : (
          <section className="grid grid-cols-2 gap-3 print:gap-0">
            {employees.map((e, index) => {
              const roleLabel = ROLE_LABELS[e.role] ?? e.role;
              const chip =
                ROLE_CHIP[e.role] ??
                "border-zinc-300 bg-zinc-50 text-zinc-700";
              const avatarBg =
                ROLE_AVATAR_BG[e.role] ?? "bg-zinc-200 text-zinc-700";
              const empCode = `EMP-${String(e.id).padStart(4, "0")}`;
              const verifyPath = `/employees/${e.id}`;
              const verifyUrl = host
                ? `${proto}://${host}${verifyPath}`
                : verifyPath;
              const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(
                verifyUrl,
              )}`;
              // Page break every 4 cards (after 4th, 8th, 12th…)
              const isLastOnPage = (index + 1) % 4 === 0;

              return (
                <article
                  key={e.id}
                  className={`employee-card relative flex break-inside-avoid flex-col items-center gap-2 overflow-hidden rounded-2xl border border-zinc-300 bg-white p-4 text-center shadow-sm print:rounded-xl print:shadow-none ${
                    isLastOnPage ? "card-page-break" : ""
                  }`}
                  style={{ minHeight: "120mm" }}
                >
                  {/* Brand mark */}
                  <div className="absolute right-3 top-3 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-amber-700">
                    <Coffee className="size-3" />
                    <span>Cafe HR</span>
                  </div>

                  {/* Avatar */}
                  <div
                    className={`mt-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-white ring-2 ring-zinc-200 ${avatarBg}`}
                  >
                    {e.avatarUrl ? (
                      <Image
                        src={e.avatarUrl}
                        alt={e.name}
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-2xl font-bold">
                        {getInitials(e.name)}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h2 className="mt-1 line-clamp-2 px-1 text-lg font-bold leading-tight text-zinc-900">
                    {e.name}
                  </h2>

                  {/* Role badge */}
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-[10pt] font-medium ${chip}`}
                  >
                    {roleLabel}
                  </span>

                  {/* Employee ID */}
                  <p className="font-mono text-[10pt] tracking-wider text-zinc-600">
                    {empCode}
                  </p>

                  {/* QR */}
                  <div className="mt-auto flex flex-col items-center pt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrSrc}
                      alt={`QR xác minh ${empCode}`}
                      width={96}
                      height={96}
                      className="rounded border border-zinc-200 bg-white"
                    />
                    <p className="mt-1 text-[8pt] uppercase tracking-wider text-zinc-500">
                      Quét để xác minh
                    </p>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .cards-print-root { background: white !important; }
          .employee-card { box-shadow: none !important; }
          /* Force page break after every 4th card (2x2 grid) */
          .card-page-break { break-after: page; page-break-after: always; }
        }
      `}</style>
    </div>
  );
}
