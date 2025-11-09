// src/app/api/notifications/route.js
import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { readAuthFromReq } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const me = readAuthFromReq(req);
  if (!me) return NextResponse.json({ items: [], count: 0 });

  const db = await getDB();

  // ADMIN -> rekap per user
  if (me.role === "admin") {
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
      LIMIT 10
    `);

    const items = rows.map((r) => ({
      id: `thread-${r.userId}`,
      userId: r.userId, // <— dipakai jika mau deep-link
      title: `Pesan dari ${r.username || `User#${r.userId}`}`,
      text: `${Number(r.unread || 0)} pesan belum dibaca`,
      href: "/admin/chat",
      unread: Number(r.unread || 0) > 0,
      ts: r.last_time ? new Date(r.last_time).getTime() : Date.now(),
    }));
    const count = items.reduce((n, it) => n + (it.unread ? 1 : 0), 0);
    return NextResponse.json({ items, count });
  }

  // USER -> balasan admin yang belum dibaca
  const [[meta]] = await db.query(
    `SELECT COUNT(*) AS unread, MAX(created_at) AS last_time
       FROM chat_messages
      WHERE room_id=? AND sender_role='admin' AND seen=0`,
    [me.id]
  );

  const items =
    meta?.last_time && Number(meta.unread || 0) > 0
      ? [
          {
            id: `u-${me.id}`,
            title: "Balasan admin",
            text: "Ada pesan baru dari admin.",
            href: "/contact",
            unread: true,
            ts: meta.last_time ? new Date(meta.last_time).getTime() : Date.now(),
          },
        ]
      : [];

  return NextResponse.json({ items, count: Number(meta?.unread || 0) });
}
