// src/app/api/support/reset-request/route.js
import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const bad = (message, code = 400) =>
    NextResponse.json({ ok: false, message }, { status: code });

  try {
    const { email, note } = await req.json().catch(() => ({}));
    const cleanEmail = (email || "").trim();
    const text = (note || "").trim();

    if (!cleanEmail) return bad("Email terdaftar wajib diisi.");
    if (!text) return bad("Pesan tidak boleh kosong.");

    const db = await getDB();

    // room_id = users.id
    const [u] = await db.query(
      "SELECT id, username FROM users WHERE email=? LIMIT 1",
      [cleanEmail]
    );
    const user = u?.[0];
    if (!user) return bad("Email tidak terdaftar.", 404);
    const roomId = Number(user.id);

    // catat tiket reset (opsional)
    await db.query(`
      CREATE TABLE IF NOT EXISTS reset_requests (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NULL,
        email VARCHAR(255) NOT NULL,
        note TEXT NULL,
        status ENUM('pending','done','rejected') NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        handled_by INT UNSIGNED NULL,
        handled_at DATETIME NULL,
        INDEX (email), INDEX (user_id), INDEX (status)
      )
    `);
    await db.query(
      "INSERT INTO reset_requests (user_id, email, note, status) VALUES (?,?,?, 'pending')",
      [roomId, cleanEmail, text.slice(0, 2000)]
    );

    // -------- introspeksi chat_messages --------
    const [cols] = await db.query("SHOW COLUMNS FROM chat_messages");
    const byName = Object.fromEntries(cols.map(c => [c.Field, c]));
    const has = (n) => !!byName[n];

    if (!has("room_id")) throw new Error("Kolom 'room_id' tidak ada di chat_messages.");
    if (!has("seen")) throw new Error("Kolom 'seen' tidak ada di chat_messages.");
    if (!has("created_at")) throw new Error("Kolom 'created_at' tidak ada di chat_messages.");

    // kolom isi pesan
    const bodyCol = ["message", "content", "text", "body"].find(n => has(n));
    if (!bodyCol) {
      throw new Error(
        `Kolom isi tidak ditemukan di chat_messages. Tersedia: ${cols.map(c=>c.Field).join(", ")}.`
      );
    }

    // kolom role
    const senderCol = has("sender_role") ? "sender_role" : has("sender") ? "sender" : null;
    if (!senderCol) {
      throw new Error(
        `Kolom pengirim tidak ditemukan di chat_messages. Tersedia: ${cols.map(c=>c.Field).join(", ")}.`
      );
    }

    // apakah ada sender_id (wajib di skemamu)
    const hasSenderId = has("sender_id");

    // tentukan nilai untuk role 'user' & 'system' sesuai tipe kolom
    const senderType = byName[senderCol]?.Type || "";

    // default ke string
    let roleUser = "user";
    let roleSystem = "system";

    if (senderType.startsWith("enum(")) {
      // enum('user','admin',...)
      const allowed = senderType
        .slice(5, -1)
        .split(",")
        .map(s => s.replace(/'/g, ""));
      if (!allowed.includes("user")) roleUser = allowed[0] || "user";
      if (!allowed.includes("system")) {
        roleSystem =
          (allowed.includes("admin") && "admin") ||
          allowed.find(v => v !== roleUser) ||
          roleUser;
      }
    } else if (senderType.startsWith("varchar(")) {
      const m = senderType.match(/varchar\((\d+)\)/i);
      const cap = m ? parseInt(m[1], 10) : 255;
      if (roleUser.length > cap) roleUser = roleUser.slice(0, cap);
      if (roleSystem.length > cap) {
        // coba 'admin' dulu; kalau masih kepanjangan, potong
        roleSystem = "admin".length <= cap ? "admin" : "a".repeat(Math.max(1, cap));
      }
    } else if (/\bint|decimal|float|double\b/i.test(senderType)) {
      // numeric (jarang, tapi antisipasi)
      roleUser = 0;
      roleSystem = 2;
    }

    // SQL dinamis: (room_id, senderCol, [sender_id], bodyCol, seen, created_at)
    const colsIns = ["room_id", `\`${senderCol}\``];
    const valsIns = ["?", "?"];
    if (hasSenderId) {
      colsIns.push("sender_id");
      valsIns.push("?"); // gunakan roomId agar NOT NULL terpenuhi
    }
    colsIns.push(`\`${bodyCol}\``, "seen", "created_at");
    valsIns.push("?", "0", "NOW()");

    const insertSql = `INSERT INTO chat_messages (${colsIns.join(", ")}) VALUES (${valsIns.join(", ")})`;

    // pesan user → unread admin
    const pUser = hasSenderId ? [roomId, roleUser, roomId, text] : [roomId, roleUser, text];
    await db.query(insertSql, pUser);

    // pesan sistem → konteks; role disesuaikan agar valid (admin/first enum/varchar-fit)
    const sysText = `Permintaan reset password dari ${cleanEmail} (via login).`;
    const pSys = hasSenderId ? [roomId, roleSystem, roomId, sysText] : [roomId, roleSystem, sysText];
    await db.query(insertSql, pSys);

    return NextResponse.json({ ok: true, roomId });
  } catch (err) {
    console.error("RESET-REQUEST ERROR:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Gagal membuat permintaan" },
      { status: 500 }
    );
  }
}
