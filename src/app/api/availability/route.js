// src/app/api/availability/route.js
import { getDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Batasi rentang hari biar hemat memori (opsional via env)
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
function buildDates(s, e) {
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

  const siteParams = searchParams
    .getAll("siteenodeb[]")
    .map((s) => s.trim())
    .filter(Boolean);

  // ===== Sites list (ringan): pakai tabel `site` bila ada; fallback DISTINCT dari kpi_raw
  let sites = [];
  try {
    const [siteRows] = await db.query(
      "SELECT `Site ID` AS site_id, `eNodeB Name` AS enb FROM `site` ORDER BY `eNodeB Name`,`Site ID` LIMIT 1000"
    );
    if (siteRows.length > 0) {
      sites = siteRows.map((r) => ({
        label: `${(r.enb || "").trim()} (${(r.site_id || "").trim()})`,
        value: `${(r.site_id || "").trim()}|${(r.enb || "").trim()}`,
      }));
    } else {
      const [distinctRows] = await db.query(
        "SELECT `Site ID` AS site_id, MAX(`eNodeB Name`) AS enb FROM `kpi_raw` WHERE `Site ID` IS NOT NULL AND `Site ID`<>'' GROUP BY `Site ID` ORDER BY `Site ID` ASC LIMIT 1000"
      );
      sites = distinctRows.map((r) => ({
        label: `${(r.enb || "").trim()} (${(r.site_id || "").trim()})`,
        value: `${(r.site_id || "").trim()}|${(r.enb || "").trim()}`,
      }));
    }
  } catch {
    // biarkan sites=[]
  }

  // ===== Global min/max dari kpi_raw (bukan view)
  let minDate = null;
  let maxDate = null;
  try {
    const [[mm]] = await db.query(
      "SELECT DATE_FORMAT(MIN(`Date`),'%Y-%m-%d') AS minDate, DATE_FORMAT(MAX(`Date`),'%Y-%m-%d') AS maxDate FROM `kpi_raw`"
    );
    minDate = mm?.minDate || null;
    maxDate = mm?.maxDate || null;
  } catch {
    // biarkan null
  }

  // ===== Jika tidak ada filter lengkap → kirim metadata saja
  const startDateQ = searchParams.get("startDate");
  const endDateQ = searchParams.get("endDate");
  if (!startDateQ || !endDateQ || siteParams.length === 0) {
    return new Response(
      JSON.stringify({
        ok: true,
        sites,
        minDate,
        maxDate,
        data: [],
        seriesNames: [],
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  }

  // ===== Ada filter → clamp range agar hemat memori
  let { start: startDate, end: endDate } = clampRange(startDateQ, endDateQ);

  // ===== Query data dari kpi_raw (AVG availability per hari per site)
  const ids = siteParams.map((s) => s.split("|")[0]);
  const placeholders = ids.map(() => "?").join(",");
  const sql = `
    SELECT DATE_FORMAT(\`Date\`,'%Y-%m-%d') AS date,
           \`Site ID\` AS siteenodeb,
           MAX(\`eNodeB Name\`) AS name,
           AVG(\`IOH_4G Cell Availability (%)\`) AS avg_avail
      FROM \`kpi_raw\`
     WHERE \`Site ID\` IN (${placeholders})
       AND \`Date\` BETWEEN ? AND ?
  GROUP BY DATE_FORMAT(\`Date\`,'%Y-%m-%d'), \`Site ID\`
  ORDER BY DATE_FORMAT(\`Date\`,'%Y-%m-%d') ASC, \`Site ID\` ASC
  `;
  const [rows] = await db.query(sql, [...ids, startDate, endDate]);

  // ===== Bentuk timeseries (semua tanggal terisi, missing -> null)
  const allDates = buildDates(startDate, endDate);
  const seriesNames = siteParams.map((s) => {
    const [id, enb] = s.split("|").map((x) => x.trim());
    return `${enb} (${id})`;
  });
  const map = new Map(
    allDates.map((d) => [
      d,
      Object.fromEntries([["date", d], ...seriesNames.map((n) => [n, null])]),
    ])
  );

  for (const r of rows) {
    const d = toISO(r.date);
    const key = `${(r.name || "").trim()} (${(r.siteenodeb || "").trim()})`;
    if (map.has(d)) map.get(d)[key] = r.avg_avail == null ? null : Number(r.avg_avail);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      sites,
      minDate,
      maxDate,
      seriesNames,
      data: Array.from(map.values()),
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
      },
    }
  );
}
