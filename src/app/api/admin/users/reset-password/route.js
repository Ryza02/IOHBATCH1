import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuth(req) {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie.split("; ").find(c => c.startsWith("token="))?.split("=")[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "devsecret");
  } catch {
    return null;
  }
}

export async function POST(req) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const { userId, newPassword } = await req.json();
  if (!userId || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ ok: false, message: "Input tidak valid" }, { status: 400 });
  }

  const db = await getDB();
  const hash = await bcrypt.hash(newPassword, 10);

  const [res] = await db.query("UPDATE users SET password_hash = ? WHERE id = ? LIMIT 1", [hash, userId]);
  if (res.affectedRows === 0) {
    return NextResponse.json({ ok: false, message: "User tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
