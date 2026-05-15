import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordHeartbeat } from "@/lib/presence";

export const dynamic = "force-dynamic";

export async function POST() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  recordHeartbeat({
    uid: sess.uid,
    name: sess.name,
    email: sess.email,
    role: sess.role,
  });
  return NextResponse.json({ ok: true });
}
