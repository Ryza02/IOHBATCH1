import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const db = await getDB();
    const { username, email, password, confirmPassword } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ message: "Lengkapi username, email, password" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ message: "Konfirmasi password tidak sama" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'user')",
      [username.trim(), email.trim(), hash]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ message: "Username atau email sudah dipakai" }, { status: 409 });
    }
    console.error("[register]", e);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
