import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { readAuthFromReq } from "@/lib/auth-server";
import { publishMessage } from "@/lib/chatHub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = readAuthFromReq(req);
  if (!me) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { content, toUserId } = await req.json();

  const text = String(content || "").trim();
  if (!text || text.length > 2000) {
    return NextResponse.json({ message: "Konten tidak valid" }, { status: 400 });
  }

  // room: user.id (satu user ↔ admin)
  // jika pengirim user => room_id = me.id
  // jika pengirim admin => wajib kirim toUserId sebagai room
  const roomId = me.role === "admin" ? Number(toUserId) : Number(me.id);
  if (!roomId) return NextResponse.json({ message: "room tidak valid" }, { status: 400 });

  const db = await getDB();
  const [rs] = await db.query(
    "INSERT INTO chat_messages (room_id, sender_id, sender_role, content) VALUES (?,?,?,?)",
    [roomId, me.id, me.role, text]
  );

  const msg = {
    id: rs.insertId,
    room_id: roomId,
    sender_id: me.id,
    sender_role: me.role,
    content: text,
    created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
  };

  // siarkan ke semua subscriber room
  publishMessage(roomId, msg);

  return NextResponse.json({ ok: true, msg });
}
