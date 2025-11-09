// scripts/geocode-sites.mjs
import mysql from "mysql2/promise";
import crypto from "crypto";
import fs from "fs/promises";

// --- KONFIG ---
const DB = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "db_ioh",
};
const REGION_SUFFIX = "Jawa Barat, Indonesia"; // sesuaikan cakupan datamu
const RATE_LIMIT_MS = 1100;                    // 1 request/detik (aman untuk Nominatim)
const LOG = (m) => console.log(new Date().toISOString(), m);

// --- Helper ---
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");

async function nominatim(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const res = await fetch(url, {
    headers: { "User-Agent": "iohdash/1.0 (contact: you@example.com)" }
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json) || !json.length) return null;
  const hit = json[0];
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    display_name: hit.display_name || "",
  };
}

async function withCache(conn, query) {
  const key = md5(query);
  const [row] = await conn.query(
    "SELECT lat,lng,json FROM geocode_cache WHERE cache_key=?",
    [key]
  );
  if (row.length) {
    return { ...JSON.parse(row[0].json), lat: row[0].lat, lng: row[0].lng, cached: true };
  }
  const result = await nominatim(query);
  await conn.query(
    "REPLACE INTO geocode_cache (cache_key,query,json,lat,lng) VALUES (?,?,?,?,?)",
    [key, query, JSON.stringify(result || {}), result?.lat ?? null, result?.lng ?? null]
  );
  await delay(RATE_LIMIT_MS);
  return result ? { ...result, cached: false } : null;
}

function score(query, display) {
  // skor sederhana kecocokan: semakin banyak token query yang ada di display_name
  const tokens = query.toLowerCase().split(/[,\s]+/).filter(Boolean);
  const hay = (display || "").toLowerCase();
  const hit = tokens.filter(t => hay.includes(t)).length;
  return Math.min(100, Math.round((hit / Math.max(tokens.length,1)) * 100));
}

async function main() {
  const conn = await mysql.createConnection(DB);

  // 1) GEOCODE DISTINCT SA -> sa_center
  LOG("Geocoding SA (centroid)...");
  const [sas] = await conn.query("SELECT DISTINCT `SA` FROM kpi_raw WHERE `SA` IS NOT NULL AND `SA`<>''");
  for (const r of sas) {
    const sa = String(r["SA"]).trim();
    const exist = await conn.query("SELECT 1 FROM sa_center WHERE sa_name=?", [sa]);
    if (exist[0].length) continue;

    const q = `${sa}, ${REGION_SUFFIX}`;
    const hit = await withCache(conn, q);
    if (hit?.lat && hit?.lng) {
      await conn.query(
        "INSERT INTO sa_center (sa_name,lat,lng,source) VALUES (?,?,?,'nominatim')",
        [sa, hit.lat, hit.lng]
      );
      LOG(`SA OK  : ${sa} -> ${hit.lat},${hit.lng}`);
    } else {
      LOG(`SA MISS: ${sa}`);
    }
  }

  // 2) GEOCODE DISTINCT SITE -> site_geo
  LOG("Geocoding Site ID...");
  // Ambil representative name per site (eNodeB Name paling sering)
  const [sites] = await conn.query(`
    SELECT s.\`Site ID\` AS site_id,
           ANY_VALUE(s.\`eNodeB Name\`) AS enb,
           ANY_VALUE(s.\`SA\`) AS sa
      FROM kpi_raw s
     WHERE s.\`Site ID\` IS NOT NULL AND s.\`Site ID\` <> ''
  GROUP BY s.\`Site ID\`
  `);

  for (const r of sites) {
    const site = String(r.site_id);
    const enb  = (r.enb || "").toString().replace(/_/g, " ");
    const sa   = (r.sa || "").toString();

    const exist = await conn.query("SELECT 1 FROM site_geo WHERE site_id=?", [site]);
    if (exist[0].length) continue;

    // Bangun query geocode yang kaya konteks
    const qCandidates = [
      `${enb}, ${sa}, ${REGION_SUFFIX}`,
      `${site}, ${sa}, ${REGION_SUFFIX}`,
      `${enb}, ${REGION_SUFFIX}`,
    ];

    let best = null;
    for (const q of qCandidates) {
      const hit = await withCache(conn, q);
      if (!hit?.lat || !hit?.lng) continue;
      const sc = score(q, hit.display_name);
      if (!best || sc > best.sc) best = { ...hit, q, sc };
      if (sc >= 70) break; // cukup yakin
    }

    if (best) {
      await conn.query(
        "INSERT INTO site_geo (site_id, lat, lng, confidence, query, source) VALUES (?,?,?,?,?,'nominatim')",
        [site, best.lat, best.lng, best.sc, best.q]
      );
      LOG(`SITE OK : ${site} (${enb}) -> ${best.lat},${best.lng} [${best.sc}]`);
    } else {
      // fallback: pakai centroid SA (kalau ada)
      const [c] = await conn.query("SELECT lat,lng FROM sa_center WHERE sa_name=?", [sa]);
      if (c.length) {
        await conn.query(
          "INSERT INTO site_geo (site_id, lat, lng, confidence, query, source) VALUES (?,?,?,?,?,'fallback-sa')",
          [site, c[0].lat, c[0].lng, 10, `centroid:${sa}`]
        );
        LOG(`SITE Fallback SA: ${site} -> ${c[0].lat},${c[0].lng}`);
      } else {
        LOG(`SITE MISS: ${site} (${enb}) [SA:${sa}]`);
      }
    }
  }

  await conn.end();
  LOG("DONE.");
}

main().catch(async (e) => {
  console.error(e);
  try { await fs.writeFile("geocode-error.log", String(e.stack||e), {flag:"a"}); } catch {}
  process.exit(1);
});
