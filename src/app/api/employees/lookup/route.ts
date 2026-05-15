import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type EmployeeLookupItem = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

const MAX_RESULTS = 8;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 1) {
    return NextResponse.json(
      { items: [] satisfies EmployeeLookupItem[] },
      {
        status: 200,
        headers: { "Cache-Control": "private, max-age=60" },
      },
    );
  }

  // Pull a few extras so we can rank: name-prefix matches first, then contains.
  const candidates = await prisma.employee.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: { id: true, name: true, role: true, avatarUrl: true },
    orderBy: { name: "asc" },
    take: MAX_RESULTS * 3,
  });

  const lower = q.toLocaleLowerCase("vi-VN");
  const ranked = candidates
    .map((e) => {
      const n = e.name.toLocaleLowerCase("vi-VN");
      let score = 3;
      if (n === lower) score = 0;
      else if (n.startsWith(lower)) score = 1;
      else if (n.split(/\s+/).some((part) => part.startsWith(lower))) score = 2;
      return { e, score };
    })
    .sort((a, b) => a.score - b.score || a.e.name.localeCompare(b.e.name, "vi"))
    .slice(0, MAX_RESULTS)
    .map(({ e }) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      avatarUrl: e.avatarUrl,
    } satisfies EmployeeLookupItem));

  return NextResponse.json(
    { items: ranked },
    {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    },
  );
}
