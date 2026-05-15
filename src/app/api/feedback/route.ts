import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { readCustomerMetadata } from "@/lib/feedback-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Source = "customer" | "user";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function parsePositiveInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

function parseSource(v: string | null): Source | null {
  if (v === "customer" || v === "user") return v;
  return null;
}

type UserMeta = {
  category: string | null;
  message: string | null;
  pageUrl: string | null;
};

function readUserMeta(raw: Prisma.JsonValue | null): UserMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { category: null, message: null, pageUrl: null };
  }
  const obj = raw as { [k: string]: Prisma.JsonValue | undefined };
  const rawCategory = obj.category;
  const rawMessage = obj.message;
  const rawPageUrl = obj.pageUrl;
  return {
    category:
      typeof rawCategory === "string" && rawCategory.length > 0
        ? rawCategory
        : null,
    message:
      typeof rawMessage === "string" && rawMessage.length > 0
        ? rawMessage
        : null,
    pageUrl:
      typeof rawPageUrl === "string" && rawPageUrl.length > 0
        ? rawPageUrl
        : null,
  };
}

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limitRaw = parsePositiveInt(url.searchParams.get("limit")) ?? 50;
  const limit = clamp(limitRaw, 1, 200);
  const cursor = parsePositiveInt(url.searchParams.get("cursor"));
  const source = parseSource(url.searchParams.get("source"));

  const where: Prisma.ActivityLogWhereInput =
    source === "customer"
      ? { action: "customer.feedback" }
      : source === "user"
        ? { action: "user.feedback" }
        : { action: { in: ["customer.feedback", "user.feedback"] } };

  if (cursor !== null) {
    where.id = { lt: cursor };
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { id: "desc" },
        take: limit + 1,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    const items = sliced.map((r) => {
      const isCustomer = r.action === "customer.feedback";
      if (isCustomer) {
        const cmd = readCustomerMetadata(r.metadata);
        return {
          id: r.id,
          source: "customer" as const,
          rating: cmd.rating,
          name: cmd.name,
          contact: cmd.contact,
          message: cmd.comment ?? r.summary,
          category: null,
          pageUrl: null,
          submittedBy: r.user
            ? { name: r.user.name, email: r.user.email }
            : null,
          createdAt: r.createdAt.toISOString(),
        };
      }
      const md = readUserMeta(r.metadata);
      return {
        id: r.id,
        source: "user" as const,
        rating: null,
        name: null,
        contact: null,
        message: md.message ?? r.summary,
        category: md.category,
        pageUrl: md.pageUrl,
        submittedBy: r.user
          ? { name: r.user.name, email: r.user.email }
          : null,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      ok: true,
      items,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
      total,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message.slice(0, 300) : String(e),
      },
      { status: 503 },
    );
  }
}
