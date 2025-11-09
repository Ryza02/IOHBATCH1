import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/support/chat?email=...&limit=100
 * Balikkan riwayat chat untuk user (room_id = users.id) berdasarkan email.
 * Tanpa autentikasi (karena dipakai di login modal).
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim();
    const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || 100)));

    if (!email) {
      return NextResponse.json({ ok: true, items: [] }); // kosong aja
    }

    const db = await getDB();

    // Dapatkan room_id = users.id
    const [u] = await db.query("SELECT id FROM users WHERE email=? LIMIT 1", [email]);
    const user = u?.[0];
    if (!user) {
      return NextResponse.json({ ok: true, items: [] }); // belum terdaftar
    }
    const roomId = Number(user.id);

    // Introspeksi struktur chat_messages
    const [cols] = await db.query("SHOW COLUMNS FROM chat_messages");
    const names = cols.map(c => c.Field);
    const has = (n) => names.includes(n);

    if (!has("room_id") || !has("created_at")) {
      throw new Error("Tabel chat_messages wajib punya room_id & created_at.");
    }

    const senderCol = has("sender_role") ? "sender_role" : has("sender") ? "sender" : null;
    if (!senderCol) throw new Error("Kolom sender_role/sender tidak ditemukan.");

    const bodyCol =
      (has("message") && "message") ||
      (has("content") && "content") ||
      (has("text") && "text") ||
      (has("body") && "body") ||
      null;
    if (!bodyCol) throw new Error("Kolom isi (message/content/text/body) tidak ditemukan.");

    const order = has("id")
      ? "ORDER BY created_at ASC, id ASC"
      : "ORDER BY created_at ASC";

    const sql = `
      SELECT room_id, \`${senderCol}\` AS role, \`${bodyCol}\` AS content, created_at
      FROM chat_messages
      WHERE room_id = ?
      ${order}
      LIMIT ?
    `;
    const [rows] = await db.query(sql, [roomId, limit]);

    // Normalisasi kecil: kalau role 'system', biarin aja (di UI kita kasih warna beda)
    return NextResponse.json({ ok: true, items: rows });
  } catch (err) {
    console.error("CHAT HISTORY ERROR:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Gagal mengambil chat" },
      { status: 500 }
    );
  }
}
