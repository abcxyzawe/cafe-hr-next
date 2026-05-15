import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const KIOSK_ACTIONS = ["kiosk.checkin", "kiosk.checkout"];

/**
 * Public SSE stream filtered to kiosk events only.
 * Mounted at /api/kiosk/stream and whitelisted in proxy.ts.
 * Drives the recent-check-ins ticker on /kiosk without requiring auth.
 */
export async function GET() {
  const encoder = new TextEncoder();
  let lastId = 0;
  let closed = false;

  const latest = await prisma.activityLog.findFirst({
    where: { action: { in: KIOSK_ACTIONS } },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  lastId = latest?.id ?? 0;

  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      safeEnqueue(`event: ready\ndata: ${JSON.stringify({ lastId })}\n\n`);

      const poll = setInterval(async () => {
        if (closed) return;
        try {
          const fresh = await prisma.activityLog.findMany({
            where: { id: { gt: lastId }, action: { in: KIOSK_ACTIONS } },
            orderBy: { id: "asc" },
            take: 20,
          });
          for (const a of fresh) {
            safeEnqueue(
              `data: ${JSON.stringify({
                id: a.id,
                action: a.action,
                summary: a.summary,
                createdAt: a.createdAt.toISOString(),
              })}\n\n`,
            );
            lastId = a.id;
          }
        } catch {
          // Swallow — public endpoint should not leak DB errors
        }
      }, POLL_INTERVAL_MS);

      const heartbeat = setInterval(() => {
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      }, HEARTBEAT_INTERVAL_MS);

      const cleanup = () => {
        closed = true;
        clearInterval(poll);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      };
      (controller as unknown as { _cleanup?: () => void })._cleanup = cleanup;
    },
    cancel() {
      const cleanup = (this as unknown as { _cleanup?: () => void })._cleanup;
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
