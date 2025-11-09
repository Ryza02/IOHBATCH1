import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

export async function POST(req) {
  try {
    const db = await getDB();

    // Terima identifier (username ATAU email) & password
    const body = await req.json().catch(() => ({}));
    const { identifier, username, email, password } = body || {};
    const idf = (identifier ?? username ?? email ?? "").toString().trim();

    if (!idf || !password) {
      return NextResponse.json(
        { message: "Username/email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `SELECT id, username, email, COALESCE(NULLIF(role,''),'user') AS role, password_hash
       FROM users
       WHERE LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?)
       LIMIT 1`,
      [idf, idf]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) {
      return NextResponse.json({ message: "Password salah." }, { status: 401 });
    }

    // === SIGN JWT untuk cookie 'token' (dipakai /api/profile & /api/profile/avatar) ===
    const payload = { uid: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: COOKIE_MAX_AGE });

    const res = NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    // Cookie session (HttpOnly) → dibaca server (getAuthedUser)
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    // Cookie display (non-HttpOnly) → bisa dibaca Header di client untuk seed awal
    const base = { path: "/", sameSite: "lax", maxAge: COOKIE_MAX_AGE };
    res.cookies.set("ioh_user", user.username, base);
    res.cookies.set("ioh_role", user.role, base);

    return res;
  } catch (e) {
    console.error("[login] error:", e);
    return NextResponse.json({ message: "Login gagal." }, { status: 500 });
  }
}
