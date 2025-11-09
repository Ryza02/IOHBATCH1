// src/app/api/traffic/route.js
import { getDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Batas hari agar query tidak membebani RAM (bisa set via env API_MAX_DAYS)
const MAX_DAYS = Number(process.env.API_MAX_DAYS || 31);

// ===== Helpers =====
const z = (n) => String(n).padStart(2, "0");
const fmt = (d) =>
  `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`;
const addDays = (d, n) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
const toISO = (d) => {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt) ? null : dt.toISOString().slice(0, 10);
};
function clampRange(start, end) {
  // tukar bila kebalik
  let s = start <= end ? start : end;
  let e = start <= end ? end : start;
  const sd = new Date(`${s}T00:00:00Z`);
  const ed = new Date(`${e}T00:00:00Z`);
  const days = Math.round((ed - sd) / 86400000) + 1;
  if (days > MAX_DAYS) {
    // ambil ekor sepanjang MAX_DAYS
    const newStart = fmt(addDays(ed, -(MAX_DAYS - 1)));
    return { start: newStart, end: e };
  }
  return { start: s, end: e };
}
function buildAllDates(s, e) {
  const out = [];
  const sd = new Date(`${s}T00:00:00Z`);
  const ed = new Date(`${e}T00:00:00Z`);
  for (let d = new Date(sd); d <= ed; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(fmt(d));
  }
  return out;
}

export async function GET(req) {
  const db = await getDB();
  const { searchParams } = new URL(req.url);

  // ====== PARAMS ======
  const siteParams = searchParams
    .getAll("siteenodeb[]")
    .map((s) => s.trim())
    .filter(Boolean);

  // default: 14 hari terakhir (tanpa MIN/MAX global yang berat)
  const today = fmt(new Date());
  const defStart = fmt(addDays(new Date(), -13));
  let startDate = searchParams.get("startDate") || defStart;
  let endDate = searchParams.get("endDate") || today;

  ({ start: startDate, end: endDate } = clampRange(startDate, endDate));

  // ====== SITE OPTIONS (ringan) ======
  // Pakai tabel `site` jika ada isinya; kalau kosong fallback ke DISTINCT dari kpi_raw
  let sites = [];
  try {
    const [siteRows] = await db.query(
      "SELECT `Site ID` AS site_id, `eNodeB Name` AS enb FROM `site` ORDER BY `eNodeB Name`, `Site ID` LIMIT 1000"
    );
    if (siteRows.length > 0) {
      sites = siteRows.map((r) => ({
        label: `${(r.enb || "").trim()} (${(r.site_id || "").trim()})`,
        value: `${(r.site_id || "").trim()}|${(r.enb || "").trim()}`,
      }));
    } else {
      const [distinctRows] = await db.query(
        "SELECT `Site ID` AS site_id, MAX(`eNodeB Name`) AS enb FROM `kpi_raw` WHERE `Site ID` IS NOT NULL AND `Site ID` <> '' GROUP BY `Site ID` ORDER BY `Site ID` ASC LIMIT 1000"
      );
      sites = distinctRows.map((r) => ({
        label: `${(r.enb || "").trim()} (${(r.site_id || "").trim()})`,
        value: `${(r.site_id || "").trim()}|${(r.enb || "").trim()}`,
      }));
    }
  } catch {
    // biarin kosong kalau gagal
  }

  // ====== Global min/max yang ringan (optional) ======
  // Ambil via ORDER BY + LIMIT (lebih ramah RAM ketimbang MIN/MAX di view)
  let minDate = null,
    maxDate = null;
  try {
    const [[minRow]] = await db.query(
      "SELECT DATE_FORMAT(`Date`,'%Y-%m-%d') AS d FROM `kpi_raw` WHERE `Date` IS NOT NULL ORDER BY `Date` ASC LIMIT 1"
    );
    const [[maxRow]] = await db.query(
      "SELECT DATE_FORMAT(`Date`,'%Y-%m-%d') AS d FROM `kpi_raw` WHERE `Date` IS NOT NULL ORDER BY `Date` DESC LIMIT 1"
    );
    minDate = minRow?.d || null;
    maxDate = maxRow?.d || null;
  } catch {
    // biarkan null jika gagal
  }

  // ====== Jika BELUM ada start/end → kirim metadata + defaultSites (tanpa data berat) ======
  if (!searchParams.get("startDate") || !searchParams.get("endDate")) {
    let defaultSites = [];
    try {
      const [[last]] = await db.query(
        "SELECT DATE_FORMAT(MAX(`Date`),'%Y-%m-%d') AS lastDate FROM `kpi_raw`"
      );
      if (last?.lastDate) {
        const [top] = await db.query(
          `
            SELECT \`Site ID\` AS id, MAX(\`eNodeB Name\`) AS name, SUM(\`Traffic GB\`) AS t
              FROM \`kpi_raw\`
             WHERE \`Date\` = ?
          GROUP BY \`Site ID\`
          ORDER BY t DESC
             LIMIT 3
          `,
          [last.lastDate]
        );
        defaultSites = top.map((r) => ({
          label: `${(r.name || "").trim()} (${(r.id || "").trim()})`,
          value: `${(r.id || "").trim()}|${(r.name || "").trim()}`,
        }));
      }
    } catch {
      // fallback
    }
    if (defaultSites.length === 0) defaultSites = sites.slice(0, 3);

    return new Response(
      JSON.stringify({
        ok: true,
        sites,
        defaultSites,
        minDate,
        maxDate,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=30",
        },
      }
    );
  }

  // ====== DATA ======
  if (siteParams.length > 0) {
    // Per-site series
    const pairs = siteParams.map((s) => s.split("|").map((v) => v.trim()));
    const ids = pairs.map(([id]) => id);
    const placeholders = ids.map(() => "?").join(",");

    const [rows] = await db.query(
      `
      SELECT DATE_FORMAT(\`Date\`,'%Y-%m-%d') AS date,
             \`Site ID\` AS site_id,
             SUM(\`Traffic GB\`) AS total_gb
        FROM \`kpi_raw\`
       WHERE \`Site ID\` IN (${placeholders})
         AND \`Date\` BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(\`Date\`,'%Y-%m-%d'), \`Site ID\`
    ORDER BY DATE_FORMAT(\`Date\`,'%Y-%m-%d') ASC
      `,
      [...ids, startDate, endDate]
    );

    const allDates = buildAllDates(startDate, endDate);
    const seriesNames = pairs.map(([id, enb]) => `${enb} (${id})`);

    // map tanggal -> object { date, "ENB (ID)": value|null, ... }
    const base = Object.fromEntries([["date", null], ...seriesNames.map((n) => [n, 0])]);
    const table = new Map(allDates.map((d) => [d, { ...base, date: d }]));

    for (const r of rows) {
      const d = r.date;
      const key = seriesNames.find((nm) => nm.endsWith(`(${r.site_id})`));
      if (!key) continue;
      const cur = table.get(d);
      if (cur) cur[key] = r.total_gb == null ? 0 : Number(r.total_gb);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: Array.from(table.values()),
        seriesNames,
        sites,
        minDate,
        maxDate,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=15",
        },
      }
    );
  } else {
    // Total per tanggal (tanpa per-site)
    const [rows] = await db.query(
      `
      SELECT DATE_FORMAT(\`Date\`,'%Y-%m-%d') AS date,
             SUM(\`Traffic GB\`) AS total_gb
        FROM \`kpi_raw\`
       WHERE \`Date\` BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(\`Date\`,'%Y-%m-%d')
    ORDER BY DATE_FORMAT(\`Date\`,'%Y-%m-%d') ASC
      `,
      [startDate, endDate]
    );

    const data = rows.map((r) => ({
      date: r.date,
      "Total Traffic": Number(r.total_gb || 0),
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        data,
        seriesNames: ["Total Traffic"],
        sites,
        minDate,
        maxDate,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=15",
        },
      }
    );
  }
}
