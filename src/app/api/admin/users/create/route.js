// src/app/api/admin/users/create/route.js
import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const token = cookie.split(/;\s*/).find(s => s.startsWith("token="))?.split("=")[1];
    const payload = token ? jwt.verify(token, process.env.JWT_SECRET || "devsecret") : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ ok: false, code: "NOT_ADMIN", message: "Forbidden" }, { status: 403 });
    }

    const { username, email, password } = await req.json();
    if (!username || !email || !password || password.length < 6) {
      return NextResponse.json({ ok: false, message: "Invalid input" }, { status: 400 });
    }

    const db = await getDB();
    const [[dupU]] = await db.query("SELECT 1 FROM users WHERE username = ? LIMIT 1", [username.trim()]);
    if (dupU) return NextResponse.json({ ok: false, code: "DUP_USERNAME", message: "Username sudah dipakai" }, { status: 409 });
    const [[dupE]] = await db.query("SELECT 1 FROM users WHERE email = ? LIMIT 1", [email.trim()]);
    if (dupE) return NextResponse.json({ ok: false, code: "DUP_EMAIL", message: "Email sudah terdaftar" }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?,?,?,?,NOW())",
      [username.trim(), email.trim(), hash, "admin"]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[create-admin]", e);
    const status = e?.name === "JsonWebTokenError" ? 401 : 500;
    return NextResponse.json({ ok: false, message: "Internal error" }, { status });
  }
}
