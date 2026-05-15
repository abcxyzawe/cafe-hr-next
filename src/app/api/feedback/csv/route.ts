import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { readCustomerMetadata } from "@/lib/feedback-helpers";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.activityLog.findMany({
    where: { action: { in: ["customer.feedback", "user.feedback"] } },
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: { user: { select: { name: true, email: true } } },
  });

  const header = [
    "id",
    "source",
    "rating",
    "name",
    "contact",
    "comment",
    "submittedBy",
    "submittedByEmail",
    "createdAt",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    const isCustomer = r.action === "customer.feedback";
    const source = isCustomer ? "customer" : "user";
    let rating: number | null = null;
    let name: string | null = null;
    let contact: string | null = null;
    let comment: string = r.summary;

    if (isCustomer) {
      const md = readCustomerMetadata(r.metadata);
      rating = md.rating;
      name = md.name;
      contact = md.contact;
      comment = md.comment ?? r.summary;
    } else if (
      r.metadata &&
      typeof r.metadata === "object" &&
      !Array.isArray(r.metadata)
    ) {
      const obj = r.metadata as Record<string, unknown>;
      if (typeof obj.message === "string") comment = obj.message;
    }

    lines.push(
      [
        r.id,
        source,
        rating ?? "",
        name ?? "",
        contact ?? "",
        comment,
        r.user?.name ?? "",
        r.user?.email ?? "",
        new Date(r.createdAt).toISOString(),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const body = "\ufeff" + lines.join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  const fname = `phan-hoi-${today}.csv`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
