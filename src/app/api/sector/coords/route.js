import getDb from "@/lib/db";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

// jarak haversine (km)
function distKm(aLat, aLng, bLat, bLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sLat = toRad(aLat);
  const sLat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(sLat) * Math.cos(sLat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const sector  = url.searchParams.get("sector") || "";
    const start   = url.searchParams.get("start")  || "";
    const end     = url.searchParams.get("end")    || "";
    const siteKey = (url.searchParams.get("siteKey") || "").trim();
    // max titik yang ditampilkan (0 = semua)
    const nearest = Math.max(
      0,
      Math.min(50, parseInt(url.searchParams.get("nearest") || "5", 10) || 5)
    );

    if (!sector || !start || !end) {
      return NextResponse.json({ points: [], center: null, bounds: null });
    }

    const db = getDb();

    // 1) Kumpulkan site_id di sektor & rentang tanggal (filter site group via LIKE siteKey)
    const params = [sector];
    let likeClause = "";
    if (siteKey) {
      likeClause = " AND `Cell Name` LIKE CONCAT('%', ?, '%') ";
      params.push(siteKey);
    }
    params.push(start, end);

    const [siteRows] = await db.query(
      `
      SELECT \`Site ID\` AS site_id,
             COUNT(*) AS cnt,
             COUNT(DISTINCT \`Cell Name\`) AS cells
      FROM   \`kpi_raw\`
      WHERE  \`Sector\`=? ${likeClause}
        AND  \`Date\` BETWEEN ? AND ?
      GROUP BY \`Site ID\`
      ORDER BY cnt DESC
      `,
      params
    );

    const totalSites = siteRows.length;
    if (!totalSites) {
      return NextResponse.json({ points: [], center: null, bounds: null, meta: { totalSites: 0, withGeo: 0, missingGeo: [] } });
    }

    const selectedId = siteRows[0].site_id;
    const ids = siteRows.map(r => r.site_id);

    // 2) Ambil koordinat yg tersedia
    const ph = ids.map(() => "?").join(",");
    const [geo] = await db.query(
      `SELECT site_id, lat, lng, confidence FROM \`site_geo\` WHERE site_id IN (${ph})`,
      ids
    );
    const geoById = new Map(geo.map(g => [g.site_id, g]));
    const withGeoSet = new Set(geo.map(g => g.site_id));
    const missingGeo = ids.filter(id => !withGeoSet.has(id));

    let points = siteRows
      .map(r => {
        const g = geoById.get(r.site_id) || {};
        return {
          site_id: r.site_id,
          name: siteKey ? `${siteKey} – ${r.site_id}` : r.site_id,
          lat: g.lat ?? null,
          lng: g.lng ?? null,
          confidence: g.confidence ?? null,
          cells: Number(r.cells || 0),
          selected: r.site_id === selectedId,
        };
      })
      .filter(p => p.lat != null && p.lng != null);

    const withGeo = points.length;

    if (!withGeo) {
      return NextResponse.json({
        points: [],
        center: null,
        bounds: null,
        meta: { totalSites, withGeo, missingGeo }
      });
    }

    // 3) Batasi N terdekat dari site terpilih
    if (nearest > 0 && points.length > nearest) {
      const sel = points.find(p => p.selected);
      const ref = sel
        ? { lat: Number(sel.lat), lng: Number(sel.lng) }
        : {
            lat: points.reduce((s,p)=>s+Number(p.lat),0)/points.length,
            lng: points.reduce((s,p)=>s+Number(p.lng),0)/points.length,
          };

      if (sel) {
        const others = points
          .filter(p => p.site_id !== sel.site_id)
          .map(p => ({ ...p, __d: distKm(ref.lat, ref.lng, p.lat, p.lng) }))
          .sort((a,b) => a.__d - b.__d)
          .slice(0, Math.max(0, nearest - 1))
          .map(({__d, ...rest}) => rest);
        points = [sel, ...others];
      } else {
        points = points
          .map(p => ({ ...p, __d: distKm(ref.lat, ref.lng, p.lat, p.lng) }))
          .sort((a,b) => a.__d - b.__d)
          .slice(0, nearest)
          .map(({__d, ...rest}) => rest);
      }
    }

    // 4) Center & bounds
    const selPoint = points.find(p => p.selected);
    const center = selPoint
      ? { lat: Number(selPoint.lat), lng: Number(selPoint.lng), zoom: 14 }
      : {
          lat: points.reduce((s,p)=>s+Number(p.lat),0)/points.length,
          lng: points.reduce((s,p)=>s+Number(p.lng),0)/points.length,
          zoom: points.length === 1 ? 14 : 12,
        };

    const lats = points.map(p => Number(p.lat));
    const lngs = points.map(p => Number(p.lng));
    const bounds = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];

    return NextResponse.json(
      { points, center, bounds, meta: { totalSites, withGeo, missingGeo } },
      { headers: { "cache-control": "s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch (e) {
    console.error("[sector/coords]", e);
    return NextResponse.json(
      { points: [], center: null, bounds: null, meta: { totalSites: 0, withGeo: 0, missingGeo: [] } },
      { status: 500 }
    );
  }
}
