import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import crypto from "crypto";
import { hashPassword } from "@/lib/auth"; // pastikan ada util ini (bcrypt/argon2)

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, otp, newPassword } = await req.json().catch(() => ({}));
    if (!email?.trim() || !otp?.trim() || !newPassword) {
      return NextResponse.json({ message: "Email, OTP, dan password baru wajib" }, { status: 400 });
    }

    const db = getDb();

    // cari user
    const [rows] = await db.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email.trim()]);
    const user = rows?.[0];
    if (!user) return NextResponse.json({ message: "OTP tidak valid atau kedaluwarsa" }, { status: 400 });

    // verifikasi OTP: cocokkan HASH
    const tokenHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    const [tks] = await db.execute(
      `SELECT id, attempts, expires_at, used_at
         FROM password_reset_tokens
        WHERE user_id=? AND token_hash=?
        ORDER BY id DESC LIMIT 1`,
      [user.id, tokenHash]
    );
    const token = tks?.[0];
    if (!token) return NextResponse.json({ message: "OTP tidak valid atau kedaluwarsa" }, { status: 400 });
    if (token.used_at) return NextResponse.json({ message: "OTP sudah dipakai" }, { status: 400 });
    if (new Date(token.expires_at) < new Date()) return NextResponse.json({ message: "OTP kedaluwarsa" }, { status: 400 });
    if (token.attempts >= 5) return NextResponse.json({ message: "OTP dikunci. Minta ulang." }, { status: 400 });

    // tandai dipakai
    await db.execute(
      "UPDATE password_reset_tokens SET attempts=attempts+1, used_at=NOW() WHERE id=?",
      [token.id]
    );

    // set password baru
    const hash = await hashPassword(newPassword);
    await db.execute(
      "UPDATE users SET password=?, password_reset_required=0, last_password_change=NOW() WHERE id=?",
      [hash, user.id]
    );

    // (opsional) hapus tokens lama user ini:
    // await db.execute("DELETE FROM password_reset_tokens WHERE user_id=?", [user.id]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("RESET VERIFY ERROR:", err);
    return NextResponse.json({ message: "Gagal memproses verifikasi" }, { status: 500 });
  }
}
