// app/api/admin/data/route.js
import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "kpi_raw";

function buildWhere({ sector, site_id, range, dateFrom, dateTo }) {
  const where = [];
  const args = [];

  if (sector) { where.push("`Sector` = ?"); args.push(sector); }
  if (site_id) { where.push("`Site ID` = ?"); args.push(site_id); }

  switch (range) {
    case "weekly":  where.push("`Date` >= (CURDATE() - INTERVAL 7 DAY)"); break;
    case "monthly": where.push("`Date` >= (CURDATE() - INTERVAL 1 MONTH)"); break;
    case "yearly":  where.push("`Date` >= (CURDATE() - INTERVAL 1 YEAR)"); break;
    case "custom":
      if (dateFrom) { where.push("`Date` >= ?"); args.push(dateFrom); }
      if (dateTo)   { where.push("`Date` <= ?"); args.push(dateTo); }
      break;
    default: break;
  }

  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", args };
}

export async function GET(req) {
  try {
    const db = await getDB();
    const { searchParams } = new URL(req.url);

    const page    = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("perPage") || "20", 10)));

    const sector   = searchParams.get("sector") || undefined;
    const site_id  = searchParams.get("site_id") || undefined;
    const range    = searchParams.get("range") || "all";
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo   = searchParams.get("dateTo") || undefined;

    const { clause, args } = buildWhere({ sector, site_id, range, dateFrom, dateTo });

    const [countRows] = await db.query(`SELECT COUNT(*) AS cnt FROM \`${TABLE}\` ${clause}`, args);
    const total = countRows?.[0]?.cnt || 0;

    const offset = (page - 1) * perPage;
    const [rows] = await db.query(
      `
      SELECT
        id,
        \`Date\`, \`Time\`,
        \`eNodeB Name\`,
        \`Cell FDD TDD Indication\`,
        \`Cell Name\`,
        \`LocalCell Id\`,
        \`eNodeB Function Name\`,
        \`Integrity\`,
        \`User\`,
        \`PRB\`,
        \`EUT\`,
        \`TA Meter\`,
        \`Traffic GB\`,
        \`CQI\`,
        \`IOH_4G Rank2 %\`,
        \`IOH_4G Cell Availability (%)\`,
        \`UL.Interference.Avg(dBm)\`,
        \`Site ID\`,
        \`Sector\`,
        \`SA\`
      FROM \`${TABLE}\`
      ${clause}
      ORDER BY \`Date\` DESC, \`Time\` DESC
      LIMIT ? OFFSET ?
      `,
      [...args, perPage, offset]
    );

    const [sites] = await db.query(
      `
      SELECT \`Site ID\` AS site_id, MAX(\`eNodeB Name\`) AS enodeb_name
      FROM \`${TABLE}\`
      ${clause}
      GROUP BY \`Site ID\`
      ORDER BY \`Site ID\` ASC
      `,
      args
    );

    const [sectors] = await db.query(
      `
      SELECT DISTINCT \`Sector\` AS sector
      FROM \`${TABLE}\`
      ${clause}
      ORDER BY \`Sector\` ASC
      `,
      args
    );

    return NextResponse.json({
      rows,
      total,
      sites: sites.map(s => ({ site_id: s.site_id, enodeb_name: s.enodeb_name })),
      sectors: sectors.map(s => s.sector),
    });
  } catch (e) {
    console.error("[api/admin/data]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}