import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import jwt from "jsonwebtoken";

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

export async function GET(req) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const db = await getDB();
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get("perPage") || "10", 10)));
  const q = (searchParams.get("q") || "").trim();

  const where = [];
  const args = [];
  if (q) {
    where.push("(username LIKE ? OR email LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [[countRow]] = await db.query(`SELECT COUNT(*) AS cnt FROM users ${clause}`, args);
  const total = Number(countRow?.cnt || 0);

  const offset = (page - 1) * perPage;
  const [rows] = await db.query(
    `SELECT id, username, email, role, created_at
       FROM users
       ${clause}
   ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?`,
    [...args, perPage, offset]
  );

  return NextResponse.json({ items: rows, total, page, perPage });
}
