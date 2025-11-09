import getDb from "@/lib/db";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const COL = {
  user:  "`User`",
  eut:   "`EUT`",
  prb:   "`PRB`",
  cqi:   "`CQI`",
  rank2: "`IOH_4G Rank2 %`",
  ulint: "`UL.Interference.Avg(dBm)`",
};

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const metric = (url.searchParams.get("metric") || "")
      .toLowerCase()
      .split("?")[0]   // ⛳ sanitize jika ada sisa query
      .split("&")[0];  // ⛳ sanitize tambahan
    const sector = url.searchParams.get("sector");
    const mode   = (url.searchParams.get("mode") || "site").toLowerCase();
    const site   = url.searchParams.get("site") || "";
    const start  = url.searchParams.get("start");
    const end    = url.searchParams.get("end");
    const limitSeries = Number(url.searchParams.get("limitSeries") || "24");

    if (!COL[metric] || !sector || !start || !end || mode !== "site") {
      return NextResponse.json({ labels: [], datasets: [] });
    }
    const db = getDb();
    const col = COL[metric];

    // 1) pilih cell series (ranking by avg metric)
    const [rank] = await db.query(
      `
      SELECT \`Cell Name\` AS cell, AVG(${col}) AS avgv
      FROM \`kpi_raw\`
      WHERE \`Sector\`=? AND \`Cell Name\` LIKE CONCAT('%', ?, '%')
        AND \`Date\` BETWEEN ? AND ?
      GROUP BY \`Cell Name\`
      ORDER BY avgv DESC, \`Cell Name\` ASC
      ${limitSeries > 0 ? "LIMIT ?" : ""}
      `,
      limitSeries > 0 ? [sector, site, start, end, limitSeries] : [sector, site, start, end]
    );
    const cells = rank.map(r => r.cell);
    if (!cells.length) return NextResponse.json({ labels: [], datasets: [] });

    // 2) timeseries
    const ph = cells.map(()=>"?").join(",");
    const params = [sector, start, end, ...cells];
    const [rows] = await db.query(
      `
      SELECT \`Date\` AS d, \`Cell Name\` AS cell, AVG(${col}) AS v
      FROM \`kpi_raw\`
      WHERE \`Sector\`=? AND \`Date\` BETWEEN ? AND ?
        AND \`Cell Name\` IN (${ph})
      GROUP BY \`Date\`, \`Cell Name\`
      ORDER BY \`Date\`
      `,
      params
    );

    const labels = [...new Set(rows.map(r => r.d))].sort();
    const idx = new Map(labels.map((d,i)=>[d,i]));
    const map = new Map(cells.map(c => [c, new Array(labels.length).fill(null)]));
    for (const r of rows) {
      const i = idx.get(r.d);
      const arr = map.get(r.cell);
      if (i!=null && arr) arr[i] = Number(r.v ?? 0);
    }
    const datasets = [...map.entries()].map(([label,data]) => ({ label, data }));

    return NextResponse.json(
      { labels, datasets },
      { headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch (e) {
    console.error("[sector/chart]", e);
    return NextResponse.json({ labels: [], datasets: [] }, { status: 500 });
  }
}
