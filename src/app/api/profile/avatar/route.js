import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import jwt from "jsonwebtoken";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuthedUser(req) {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie.split(/;\s*/).find(s => s.startsWith("token="))?.split("=")[1];
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET || "devsecret"); }
  catch { return null; }
}

export async function POST(req) {
  const auth = getAuthedUser(req);
  if (!auth) return NextResponse.json({ ok:false }, { status:401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok:false, message:"File tidak ditemukan" }, { status:400 });
  }

  const type = file.type || "";
  if (!/^image\/(png|jpeg|jpg|webp)$/i.test(type)) {
    return NextResponse.json({ ok:false, message:"Tipe gambar harus PNG/JPG/WEBP" }, { status:400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 1.5 * 1024 * 1024) {
    return NextResponse.json({ ok:false, message:"Maksimal ukuran 1.5MB" }, { status:413 });
  }

  const ext = type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1];
  const dir = path.join(process.cwd(), "public", "upload", "avatars");
  await mkdir(dir, { recursive: true });
  const filename = `${auth.uid}.${ext}`;
  const full = path.join(dir, filename);
  await writeFile(full, buf);

  const url = `/upload/avatars/${filename}`;
  const db = await getDB();
  try {
    await db.query("UPDATE users SET avatar_url=? WHERE id=?", [url, auth.uid]);
  } catch (e) {
    if (e?.code === "ER_BAD_FIELD_ERROR") {
      // kolom belum ada → tambahkan, lalu retry
      await db.query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL AFTER role");
      await db.query("UPDATE users SET avatar_url=? WHERE id=?", [url, auth.uid]);
    } else {
      console.error("[profile/avatar] update error:", e);
      return NextResponse.json({ ok:false, message:"Gagal menyimpan avatar" }, { status:500 });
    }
  }

  return NextResponse.json({ ok:true, url });
}
