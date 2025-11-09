import getDb from "@/lib/db";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const url = new URL(req.url);
  const sector = url.searchParams.get("sector");
  if (!sector) return NextResponse.json({ cells: [] });

  try {
    const db = getDb();
    const [rows] = await db.query(
      "SELECT DISTINCT `Cell Name` AS cn FROM `kpi_raw` WHERE `Sector`=? ORDER BY `Cell Name`",
      [sector]
    );
    return NextResponse.json({ cells: rows.map(r => r.cn) });
  } catch (e) {
    console.error("[sector/cellnames]", e);
    return NextResponse.json({ cells: [] }, { status: 500 });
  }
}
