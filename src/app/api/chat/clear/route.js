import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { readAuthFromReq } from "@/lib/auth-server";
import { publishClear } from "@/lib/chatHub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = readAuthFromReq(req);
  if (!me || me.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();
  const roomId = Number(userId || 0);
  if (!roomId) return NextResponse.json({ message: "userId tidak valid" }, { status: 400 });

  const db = await getDB();
  await db.query("DELETE FROM chat_messages WHERE room_id=?", [roomId]);

  // beri tahu semua subscriber di room supaya clear lokal
  publishClear(roomId);

  return NextResponse.json({ ok: true });
}
