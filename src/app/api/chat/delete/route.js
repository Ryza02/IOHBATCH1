import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { readAuthFromReq } from "@/lib/auth-server";
import { publishDelete } from "@/lib/chatHub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = readAuthFromReq(req);
  if (!me || me.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  const mid = Number(id || 0);
  if (!mid) return NextResponse.json({ message: "id tidak valid" }, { status: 400 });

  const db = await getDB();

  // cari room dulu agar bisa broadcast
  const [[row]] = await db.query("SELECT id, room_id FROM chat_messages WHERE id=?", [mid]);
  if (!row) return NextResponse.json({ message: "pesan tidak ditemukan" }, { status: 404 });

  await db.query("DELETE FROM chat_messages WHERE id=?", [mid]);

  // siarkan ke room supaya klien menghapus realtime
  publishDelete(row.room_id, mid);

  return NextResponse.json({ ok: true });
}
