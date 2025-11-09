import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const db = await getDB();
    const [r] = await db.query("SELECT 1 AS ok");
    return NextResponse.json({ ok: r?.[0]?.ok === 1 });
  } catch (e) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 });
  }
}
