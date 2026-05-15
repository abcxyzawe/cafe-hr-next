import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
// SSE requires Node runtime (not edge) for setInterval + Prisma
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 30_000;

type SerializedActivity = {
  id: number;
  action: string;
  summary: string;
  entityType: string | null;
  entityId: number | null;
  createdAt: string;
  user: { id: number; name: string; email: string; role: string } | null;
  metadata: unknown;
};

function serialize(
  a: Awaited<ReturnType<typeof prisma.activityLog.findMany>>[number] & {
    user: { id: number; name: string; email: string; role: string } | null;
  },
): SerializedActivity {
  return {
    id: a.id,
    action: a.action,
    summary: a.summary,
    entityType: a.entityType,
    entityId: a.entityId,
    createdAt: a.createdAt.toISOString(),
    user: a.user,
    metadata: a.metadata ?? null,
  };
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const encoder = new TextEncoder();
  let lastId = 0;
  let closed = false;

  // Seed lastId with the current max so we only push truly new entries
  const latest = await prisma.activityLog.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  lastId = latest?.id ?? 0;

  const stream = new ReadableStream({
    async start(controller) {
      function safeEnqueue(chunk: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      }

      // Initial handshake event
      safeEnqueue(
        `event: ready\ndata: ${JSON.stringify({ lastId })}\n\n`,
      );

      const pollTimer = setInterval(async () => {
        if (closed) return;
        try {
          const fresh = await prisma.activityLog.findMany({
            where: { id: { gt: lastId } },
            orderBy: { id: "asc" },
            take: 20,
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
            },
          });
          for (const a of fresh) {
            safeEnqueue(`data: ${JSON.stringify(serialize(a))}\n\n`);
            lastId = a.id;
          }
        } catch (e) {
          safeEnqueue(
            `event: error\ndata: ${JSON.stringify({ message: String(e).slice(0, 200) })}\n\n`,
          );
        }
      }, POLL_INTERVAL_MS);

      const heartbeat = setInterval(() => {
        if (closed) return;
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup when the underlying request is aborted
      const cleanup = () => {
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      };

      // Attach to abort signal via the controller's internal cleanup
      (controller as unknown as { _cleanup?: () => void })._cleanup = cleanup;
    },
    cancel() {
      const cleanup = (
        this as unknown as { _cleanup?: () => void }
      )._cleanup;
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
