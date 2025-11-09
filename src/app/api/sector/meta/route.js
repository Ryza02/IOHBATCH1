import getDb from "@/lib/db";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();

    const [[mm]] = await db.query(`
      SELECT
        DATE_FORMAT(MIN(\`Date\`), '%Y-%m-%d')                           AS minDate,
        DATE_FORMAT(MAX(\`Date\`), '%Y-%m-%d')                           AS maxDate,
        DATE_FORMAT(DATE_SUB(MAX(\`Date\`), INTERVAL 6 DAY), '%Y-%m-%d') AS defaultStart,
        DATE_FORMAT(MAX(\`Date\`), '%Y-%m-%d')                           AS defaultEnd
      FROM \`kpi_raw\`
    `);

    const [sectors] = await db.query(
      "SELECT DISTINCT `Sector` FROM `kpi_raw` WHERE `Sector` IS NOT NULL AND `Sector`<>'' ORDER BY `Sector`"
    );

    return new NextResponse(
      JSON.stringify({
        sectors: sectors.map((r) => r.Sector),
        minDate: mm?.minDate ?? null,
        maxDate: mm?.maxDate ?? null,
        defaultStart: mm?.defaultStart ?? null,
        defaultEnd: mm?.defaultEnd ?? null,
      }),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store, max-age=0",
        },
      }
    );
  } catch (e) {
    console.error("[sector/meta]", e);
    return NextResponse.json(
      { sectors: [], minDate: null, maxDate: null, defaultStart: null, defaultEnd: null },
      { status: 500 }
    );
  }
}
