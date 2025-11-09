import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { readAuthFromReq } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = readAuthFromReq(req);
  if (!me || me.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ message: "userId diperlukan" }, { status: 400 });

  const db = await getDB();
  await db.query("UPDATE chat_messages SET seen=1 WHERE room_id=? AND sender_role='user' AND seen=0", [userId]);
  return NextResponse.json({ ok: true });
}
