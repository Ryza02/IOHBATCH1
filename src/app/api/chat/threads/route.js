import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { readAuthFromReq } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const me = readAuthFromReq(req);
  if (!me || me.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const db = await getDB();
  const [rows] = await db.query(`
    SELECT
      cm.room_id AS userId,
      u.username,
      u.email,
      MAX(cm.created_at) AS last_time,
      SUM(CASE WHEN cm.sender_role='user' AND cm.seen=0 THEN 1 ELSE 0 END) AS unread
    FROM chat_messages cm
    LEFT JOIN users u ON u.id = cm.room_id
    GROUP BY cm.room_id, u.username, u.email
    ORDER BY last_time DESC
    LIMIT 50
  `);

  return NextResponse.json({ ok: true, items: rows });
}
