// /src/app/api/user/data/route.js
import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "kpi_raw";

// cache struktur kolom biar gak cek terus
let COLS_CACHE = null;
async function getCols(db) {
  if (COLS_CACHE) return COLS_CACHE;

  const [cols] = await db.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [TABLE]
  );
  const set = new Set(cols.map((c) => c.COLUMN_NAME));

  const pick = (...names) => names.find((n) => set.has(n)) || null;

  const colDate   = pick("Date", "date");
  const colTime   = pick("Time", "time");
  const colENB    = pick("eNodeB Name", "eNodeB");
  const colCell   = pick("Cell Name Primary", "Cell Name"); // <<— mismatch sering di sini
  const colTraffic= pick("Traffic GB", "TrafficGB", "Traffic_GB");
  const colUser   = pick("User");
  const colCQI    = pick("CQI");
  const colSite   = pick("Site ID Index", "Site ID");
  const colSector = pick("Sector Index", "Sector");

  COLS_CACHE = {
    date:   colDate  ? `\`${colDate}\``   : "NULL",
    time:   colTime  ? `\`${colTime}\``   : "NULL",
    enb:    colENB   ? `\`${colENB}\``    : "NULL",
    cell:   colCell  ? `\`${colCell}\``   : "NULL",
    traffic:colTraffic ? `\`${colTraffic}\``: "NULL",
    user:   colUser  ? `\`${colUser}\``   : "NULL",
    cqi:    colCQI   ? `\`${colCQI}\``    : "NULL",
    site:   colSite  ? `\`${colSite}\``   : "NULL",
    sector: colSector? `\`${colSector}\`` : "NULL",
    raw: { colDate, colTime, colENB, colCell, colTraffic, colUser, colCQI, colSite, colSector }
  };
  return COLS_CACHE;
}

function buildWhere({ sector, siteId, range, dateFrom, dateTo }, C) {
  const where = [];
  const args = [];

  if (sector) { where.push(`${C.sector} = ?`); args.push(sector); }
  if (siteId) { where.push(`${C.site} = ?`);   args.push(siteId); }

  switch (range) {
    case "weekly":  where.push(`${C.date} >= (CURDATE() - INTERVAL 7 DAY)`);  break;
    case "monthly": where.push(`${C.date} >= (CURDATE() - INTERVAL 1 MONTH)`);break;
    case "yearly":  where.push(`${C.date} >= (CURDATE() - INTERVAL 1 YEAR)`); break;
    case "custom":
      if (dateFrom) { where.push(`${C.date} >= ?`); args.push(dateFrom); }
      if (dateTo)   { where.push(`${C.date} <= ?`); args.push(dateTo);   }
      break;
    default: break; // all
  }

  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", args };
}

export async function GET(req) {
  try {
    const db = await getDB();
    const C = await getCols(db); // deteksi kolom

    const { searchParams } = new URL(req.url);
    const page    = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(10, Math.max(1, parseInt(searchParams.get("perPage") || "10", 10))); // max 10

    const sector   = searchParams.get("sector") || undefined;
    const siteId   = searchParams.get("siteId") || undefined;
    const range    = searchParams.get("range") || "all";
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo   = searchParams.get("dateTo") || undefined;

    const { clause, args } = buildWhere({ sector, siteId, range, dateFrom, dateTo }, C);

    // total
    const [countRows] = await db.query(`SELECT COUNT(*) AS cnt FROM ${TABLE} ${clause}`, args);
    const total = countRows?.[0]?.cnt || 0;

    // rows (select kolom dengan fallback NULL bila kolom tidak ada)
    const offset = (page - 1) * perPage;
    const [rows] = await db.query(
      `
      SELECT
        ${C.date}   AS Date,
        ${C.time}   AS Time,
        ${C.enb}    AS eNodeBName,
        ${C.cell}   AS cellName,
        ${C.traffic} AS trafficGB,
        ${C.user}   AS User,
        ${C.cqi}    AS CQI,
        ${C.site}   AS siteId,
        ${C.sector} AS Sector
      FROM ${TABLE}
      ${clause}
      ORDER BY ${C.date} DESC, ${C.time} DESC
      LIMIT ? OFFSET ?
      `,
      [...args, perPage, offset]
    );

    // sites (distinct)
    const [sites] = await db.query(
      `
      SELECT ${C.site} AS siteId, MAX(${C.enb}) AS enodebName
      FROM ${TABLE}
      ${clause}
      GROUP BY ${C.site}
      ORDER BY ${C.site} ASC
      LIMIT 500
      `,
      args
    );

    // sectors (distinct)
    const [sectors] = await db.query(
      `
      SELECT DISTINCT ${C.sector} AS sector
      FROM ${TABLE}
      ${clause}
      ORDER BY ${C.sector} ASC
      `,
      args
    );

    return NextResponse.json(
      {
        items: rows,
        total,
        page,
        perPage,
        sites: sites.map((s) => ({ siteId: s.siteId, enodebName: s.enodebName })),
        sectors: sectors.map((s) => s.sector),
      },
      { headers: { "Cache-Control": "public, max-age=10" } }
    );
  } catch (e) {
    console.error("[api/user/data]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
