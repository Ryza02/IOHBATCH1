import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import crypto from "crypto";

export const runtime = "nodejs"; // penting agar nodemailer jalan

function genOTP() {
  return "" + Math.floor(100000 + Math.random() * 900000); // 6 digit
}

export async function POST(req) {
  try {
    const { email } = await req.json().catch(() => ({}));
    if (!email?.trim()) {
      return NextResponse.json({ message: "Email wajib diisi" }, { status: 400 });
    }

    const db = getDb();
    const [rows] = await db.execute(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      [email.trim()]
    );
    const user = rows?.[0];

    // balasan generik (jangan bocorkan keberadaan akun)
    if (!user) return NextResponse.json({ ok: true });

    // buat OTP, simpan sebagai HASH
    const otp = genOTP();
    const tokenHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    await db.execute(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)",
      [user.id, tokenHash, expiresAt]
    );

    // kirim email OTP
    await sendMail({
      to: user.email,
      subject: "Kode OTP Reset Password",
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#111">
          <p>Halo,</p>
          <p>Kode OTP Anda untuk reset password:</p>
          <p style="font-size:22px;font-weight:700;letter-spacing:2px">${otp}</p>
          <p>Kode berlaku <b>10 menit</b>. Abaikan email ini jika Anda tidak meminta reset.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
          <p style="color:#666">IOH App</p>
        </div>`,
      text: `Kode OTP Anda: ${otp} (berlaku 10 menit)`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("RESET REQUEST ERROR:", err);
    return NextResponse.json({ message: "Gagal memproses permintaan" }, { status: 500 });
  }
}
