import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuthedUser(req) {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie.split(/;\s*/).find(s => s.startsWith("token="))?.split("=")[1];
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET || "devsecret"); }
  catch { return null; }
}

export async function GET(req) {
  const auth = getAuthedUser(req);
  if (!auth) return NextResponse.json({ ok:false }, { status:401 });

  const db = await getDB();
  try {
    const [rows] = await db.query(
      "SELECT id, username, email, role, avatar_url, created_at FROM users WHERE id=? LIMIT 1",
      [auth.uid]
    );
    const me = rows?.[0];
    if (!me) return NextResponse.json({ ok:false }, { status:404 });
    return NextResponse.json({ ok:true, user: me });
  } catch (e) {
    if (e?.code === "ER_BAD_FIELD_ERROR") {
      // kolom avatar_url belum ada → fallback tanpa kolom itu
      const [rows] = await db.query(
        "SELECT id, username, email, role, created_at FROM users WHERE id=? LIMIT 1",
        [auth.uid]
      );
      const me = rows?.[0];
      if (!me) return NextResponse.json({ ok:false }, { status:404 });
      return NextResponse.json({ ok:true, user: { ...me, avatar_url: null } });
    }
    console.error("[profile][GET]", e);
    return NextResponse.json({ ok:false }, { status:500 });
  }
}

export async function POST(req) {
  const auth = getAuthedUser(req);
  if (!auth) return NextResponse.json({ ok:false }, { status:401 });

  const body = await req.json().catch(() => ({}));
  const { username, email, currentPassword, newPassword } = body;

  const db = await getDB();
  const [[me]] = await db.query(
    "SELECT id, username, email, password_hash FROM users WHERE id=? LIMIT 1",
    [auth.uid]
  );
  if (!me) return NextResponse.json({ ok:false }, { status:404 });

  // update username/email
  if (typeof username === "string" || typeof email === "string") {
    const updates = [], params = [];
    if (typeof username === "string" && username.trim() && username.trim() !== me.username) {
      const [[du]] = await db.query("SELECT 1 AS x FROM users WHERE username=? AND id<>? LIMIT 1", [username.trim(), me.id]);
      if (du) return NextResponse.json({ ok:false, code:"DUP_USERNAME", message:"Username sudah dipakai" }, { status:409 });
      updates.push("username=?"); params.push(username.trim());
    }
    if (typeof email === "string" && email.trim() && email.trim() !== me.email) {
      const [[de]] = await db.query("SELECT 1 AS x FROM users WHERE email=? AND id<>? LIMIT 1", [email.trim(), me.id]);
      if (de) return NextResponse.json({ ok:false, code:"DUP_EMAIL", message:"Email sudah terdaftar" }, { status:409 });
      updates.push("email=?"); params.push(email.trim());
    }
    if (updates.length) await db.query(`UPDATE users SET ${updates.join(", ")} WHERE id=?`, [...params, me.id]);
  }

  // ganti password
  if (typeof newPassword === "string") {
    if (!currentPassword) return NextResponse.json({ ok:false, message:"Password saat ini wajib" }, { status:400 });
    const ok = await bcrypt.compare(currentPassword, me.password_hash);
    if (!ok) return NextResponse.json({ ok:false, code:"WRONG_PASSWORD", message:"Password saat ini salah" }, { status:403 });
    if (newPassword.length < 6) return NextResponse.json({ ok:false, message:"Password baru minimal 6 karakter" }, { status:400 });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash=? WHERE id=?", [hash, me.id]);
  }

  return NextResponse.json({ ok:true });
}
