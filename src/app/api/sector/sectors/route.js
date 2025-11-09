import getDb from "@/lib/db";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const [rows] = await db.query(
    "SELECT DISTINCT `Sector` AS sector FROM `kpi_raw` WHERE `Sector` IS NOT NULL"
  );
  return NextResponse.json(
    rows.map(r => ({ id: r.sector, name: r.sector })),
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
  );
}
