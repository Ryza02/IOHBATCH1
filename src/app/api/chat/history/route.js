import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { readAuthFromReq } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const me = readAuthFromReq(req);
  if (!me) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || 100)));
  const userIdParam = Number(searchParams.get("userId") || 0);

  const roomId = me.role === "admin" ? userIdParam : Number(me.id);
  if (!roomId) return NextResponse.json({ message: "room invalid" }, { status: 400 });

  const db = await getDB();
  const [rows] = await db.query(
    "SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at DESC, id DESC LIMIT ?",
    [roomId, limit]
  );

  // kirim ascending
  rows.reverse();

  return NextResponse.json({ ok: true, roomId, items: rows });
}
