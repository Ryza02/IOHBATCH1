import { readAuthFromReq } from "@/lib/auth-server";
import { subscribe } from "@/lib/chatHub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const me = readAuthFromReq(req);
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = Number(searchParams.get("userId") || 0);
  const roomId = me.role === "admin" ? userId : Number(me.id);
  if (!roomId) return new Response("room invalid", { status: 400 });

  const encoder = new TextEncoder();
  let closed = false;
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const safeSend = (obj) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)); } catch {}
      };

      safeSend({ type: "hello", roomId, now: Date.now() });

      const unsub = subscribe(roomId, (payload) => {
        if (payload && payload.kind === "delete") safeSend({ type: "delete", id: payload.id });
        else if (payload && payload.kind === "clear") safeSend({ type: "clear" });
        else safeSend({ type: "message", msg: payload }); // default: pesan biasa
      });

      const hb = setInterval(() => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`)); } catch {}
      }, 25000);

      cleanup = () => {
        closed = true;
        clearInterval(hb);
        unsub();
        try { controller.close(); } catch {}
      };
    },
    cancel() { cleanup(); },
  });

  req.signal?.addEventListener?.("abort", () => cleanup());

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
