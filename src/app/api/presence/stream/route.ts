import { getSession } from "@/lib/auth";
import { activePresences, recordHeartbeat } from "@/lib/presence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 30_000;

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // Mark self as present immediately so first poll includes us
  recordHeartbeat({
    uid: sess.uid,
    name: sess.name,
    email: sess.email,
    role: sess.role,
  });

  const encoder = new TextEncoder();
  let closed = false;
  let lastSignature = "";

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

      function publish() {
        // Keep self alive on every poll for as long as stream is open
        recordHeartbeat({
          uid: sess!.uid,
          name: sess!.name,
          email: sess!.email,
          role: sess!.role,
        });
        const active = activePresences();
        // Sign so we only push when state actually changed
        const sig = active
          .map((p) => `${p.uid}:${Math.floor(p.lastSeen / 5000)}`)
          .join("|");
        if (sig === lastSignature) return;
        lastSignature = sig;
        safeEnqueue(
          `data: ${JSON.stringify({
            users: active.map((p) => ({
              uid: p.uid,
              name: p.name,
              email: p.email,
              role: p.role,
              ageMs: Date.now() - p.lastSeen,
            })),
          })}\n\n`,
        );
      }

      // Initial push
      safeEnqueue("event: ready\ndata: {}\n\n");
      publish();

      const pollTimer = setInterval(publish, POLL_INTERVAL_MS);
      const heartbeat = setInterval(() => {
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      }, HEARTBEAT_INTERVAL_MS);

      const cleanup = () => {
        closed = true;
        clearInterval(pollTimer);
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
