// src/app/api/notifications/unread/route.js
import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { readAuthFromReq } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = readAuthFromReq(req);
  if (!me) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const db = await getDB();

  // User: clear semua balasan admin
  if (me.role !== "admin") {
    await db.query(
      "UPDATE chat_messages SET seen=1 WHERE room_id=? AND sender_role='admin' AND seen=0",
      [me.id]
    );
    return NextResponse.json({ ok: true });
  }

  // Admin (opsional): clear unread dari user tertentu
  const body = await req.json().catch(() => ({}));
  const userId = Number(body?.userId || 0);
  if (userId) {
    await db.query(
      "UPDATE chat_messages SET seen=1 WHERE room_id=? AND sender_role='user' AND seen=0",
      [userId]
    );
    return NextResponse.json({ ok: true });
  }

  // default: admin tanpa userId -> tidak melakukan apa-apa
  return NextResponse.json({ ok: true });
}
