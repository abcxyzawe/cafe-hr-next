import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS, formatVND, formatDate } from "@/lib/utils";
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function EmployeesPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const sess = await getSession();
  if (!sess) {
    redirect("/login");
  }

  const sp = await searchParams;
  const roleFilter: ValidRole | undefined =
    sp.role && (VALID_ROLES as readonly string[]).includes(sp.role)
      ? (sp.role as ValidRole)
      : undefined;

  const employees = await prisma.employee.findMany({
    where: roleFilter ? { role: roleFilter } : undefined,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const issuedAt = formatDate(new Date());
  const total = employees.length;
  const backHref = roleFilter ? `/employees?role=${roleFilter}` : "/employees";

  return (
    <div className="roster-print-root bg-white text-zinc-900">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur print:hidden">
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
            Danh sách nhân viên · Ctrl/Cmd+P để in hoặc lưu PDF
          </p>
        </div>
        <PrintButton />
      </div>

      <main className="mx-auto max-w-[900px] px-8 py-8 print:max-w-none print:px-0 print:py-0">
        <header className="mb-5 flex items-start justify-between border-b-2 border-zinc-900 pb-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-96.png"
              alt="Cafe HR"
              width={44}
              height={44}
              className="rounded"
              unoptimized
            />
            <div>
              <p className="text-base font-bold tracking-wide text-zinc-900">
                CAFE HR
              </p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                Quản lý nhân sự quán cà phê
              </p>
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold tracking-tight">
              DANH SÁCH NHÂN VIÊN — EMPLOYEE ROSTER
            </h1>
            <p className="mt-1 text-xs font-mono text-zinc-700">
              Cập nhật ngày {issuedAt}
            </p>
          </div>
          <div className="text-right text-[11px] text-zinc-600">
            <p>Tổng số</p>
            <p className="font-mono text-sm font-bold text-zinc-900">
              {total} nhân viên
            </p>
            {roleFilter ? (
              <>
                <p className="mt-1">Lọc vai trò</p>
                <p className="font-mono text-xs text-zinc-900">
                  {ROLE_LABELS[roleFilter] ?? roleFilter}
                </p>
              </>
            ) : null}
          </div>
        </header>

        {employees.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            Không có nhân viên nào để in.
          </p>
        ) : (
          <section className="grid grid-cols-2 gap-3 print:grid-cols-3">
            {employees.map((e) => {
              const role = e.role;
              const roleLabel = ROLE_LABELS[role] ?? role;
              const chip = ROLE_CHIP[role] ?? "border-zinc-300 bg-zinc-50 text-zinc-700";
              const rate = Number(e.hourlyRate);
              return (
                <article
                  key={e.id}
                  className="flex break-inside-avoid flex-col items-center gap-2 rounded border border-zinc-300 p-3 text-center"
                >
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-zinc-300 bg-zinc-50">
                    {e.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.avatarUrl}
                        alt={e.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-zinc-500">
                        {getInitials(e.name)}
                      </span>
                    )}
                  </div>
                  <div className="w-full space-y-1">
                    <p className="truncate text-[11pt] font-bold text-zinc-900">
                      {e.name}
                    </p>
                    <span
                      className={`inline-block rounded border px-1.5 py-0.5 text-[9pt] font-medium ${chip}`}
                    >
                      {roleLabel}
                    </span>
                  </div>
                  <dl className="w-full space-y-1 text-left text-[9pt] text-zinc-700">
                    <div className="flex items-start gap-1.5">
                      <Phone className="mt-0.5 size-3 shrink-0 text-zinc-500" />
                      <span className="truncate font-mono">
                        {e.phone ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Mail className="mt-0.5 size-3 shrink-0 text-zinc-500" />
                      <span className="truncate">{e.email ?? "—"}</span>
                    </div>
                    <div className="mt-1 border-t border-dashed border-zinc-300 pt-1">
                      <span className="text-[8pt] uppercase tracking-wider text-zinc-500">
                        Lương/giờ
                      </span>
                      <p className="font-mono text-[10pt] font-semibold text-zinc-900">
                        {formatVND(rate)}
                      </p>
                    </div>
                  </dl>
                </article>
              );
            })}
          </section>
        )}

        <footer className="mt-10 grid grid-cols-2 gap-12 text-[10pt]">
          <div className="text-center">
            <p className="mb-1 font-semibold text-zinc-700">Quản lý</p>
            <p className="text-[9pt] italic text-zinc-500">
              (Ký và ghi rõ họ tên)
            </p>
            <div className="mt-12 border-t border-zinc-400 pt-2" />
          </div>
          <div className="text-center">
            <p className="mb-1 font-semibold text-zinc-700">Ngày phê duyệt</p>
            <p className="text-[9pt] italic text-zinc-500">
              (Ký và ghi rõ họ tên)
            </p>
            <div className="mt-12 border-t border-zinc-400 pt-2" />
          </div>
        </footer>

        <p className="mt-6 text-center text-[9pt] text-zinc-400">
          In tự động bởi Cafe HR · {issuedAt}
        </p>
      </main>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1.5cm; }
          body { background: white !important; font-size: 10pt; }
          .no-print { display: none !important; }
          .roster-print-root { background: white !important; }
        }
      `}</style>
    </div>
  );
}
