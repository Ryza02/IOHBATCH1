"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSectorFilters } from "./sector-filters-context";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), {
  ssr: false,
});

/* ===== ICONS ====== */
const dotIcon = (color = "#0ea5e9", size = 11) =>
  L.divIcon({
    className: "site-dot",
    html: `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};box-shadow:0 0 0 2px #fff,0 0 0 4px rgba(2,6,23,.65),0 0 10px ${color}88;"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const triArrowIcon = L.divIcon({
  className: "tri-arrow",
  html: `
  <div style="position:relative;filter:drop-shadow(0 4px 10px rgba(0,0,0,.75))">
    <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:26px;height:26px;border-radius:9999px;background:radial-gradient(closest-side,#fbbf2488,#f59e0b44,transparent 75%);
      box-shadow:0 0 0 2px #fff8,0 0 12px #f59e0b88;"></span>
    <svg width="32" height="32" viewBox="0 0 96 96" fill="none" style="position:relative">
      <path d="M48 10 l8 0 -8 28 -8 -28 z" stroke="#fff" stroke-width="5" fill="none"/>
      <path d="M28 62 l-8 -8 33 -5 -16 25 -9 -12 z" stroke="#fff" stroke-width="5" fill="none"/>
      <path d="M68 62 l8 -8 -33 -5 16 25 9 -12 z" stroke="#fff" stroke-width="5" fill="none"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/* ===== UTIL: pecah titik yang numplek ===== */
// offset ~15 meter mengelilingi titik utama.
// 1 meter ~ 1/111320 deg untuk lat. Untuk lon dikalikan cos(lat).
function spreadCoinciding(list) {
  if (!Array.isArray(list) || !list.length) return [];
  const keyOf = (p) =>
    `${Number(p.lat).toFixed(6)},${Number(p.lng).toFixed(6)}`;
  const groups = new Map();
  list.forEach((p) => {
    const k = keyOf(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  });

  const out = [];
  for (const [k, arr] of groups.entries()) {
    if (arr.length === 1) {
      out.push(arr[0]);
      continue;
    }

    // simpan yang selected di tengah; lainnya di-ring
    const centerIdx = Math.max(
      0,
      arr.findIndex((p) => p.selected)
    );
    const center = arr[centerIdx];
    const others = arr.filter((_, i) => i !== centerIdx);

    // radius 15 m
    const rMeters = 15;
    const lat = Number(center.lat);
    const lng = Number(center.lng);
    const dLat = rMeters / 111320; // ~deg
    const dLng = rMeters / (111320 * Math.cos((lat * Math.PI) / 180) || 1e-6);

    const step = (2 * Math.PI) / (others.length || 1);
    others.forEach((p, i) => {
      const ang = i * step;
      out.push({
        ...p,
        lat: lat + dLat * Math.sin(ang),
        lng: lng + dLng * Math.cos(ang),
        _jittered: true,
      });
    });

    // taruh yang selected/center terakhir supaya zIndex di atas
    out.push(center);
  }
  return out;
}

export default function SectorMap() {
  const { sector, cells, dateRange } = useSectorFilters();
  const selectedCell = cells[0] || "";

  // ambil kata "site group" dari label cell (mis. CIHAMPELAS)
  const siteKey = useMemo(() => {
    if (!selectedCell) return "";
    const t = selectedCell.split("_");
    return t.find((x) => /^[A-Za-z]+$/.test(x) && x.length >= 4) || t[0];
  }, [selectedCell]);

  const [points, setPoints] = useState([]);
  const [center, setCenter] = useState(null);
  const [meta, setMeta] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // fetch: selalu nearest=5 (ringan)
  useEffect(() => {
    if (!sector || !selectedCell || !dateRange.start || !dateRange.end) {
      setPoints([]);
      setCenter(null);
      setMeta(null);
      return;
    }
    const qs = new URLSearchParams({
      sector,
      start: dateRange.start,
      end: dateRange.end,
      siteKey: siteKey || "",
      nearest: "5",
    }).toString();

    let alive = true;
    fetch(`/api/sector/coords?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const arr = Array.isArray(d.points) ? d.points : [];
        setMeta(d.meta || null);

        // hitung center bila API tidak memberi
        let c = d.center;
        if (!c && arr.length) {
          const lat =
            arr.reduce((s, p) => s + Number(p.lat || 0), 0) / arr.length;
          const lng =
            arr.reduce((s, p) => s + Number(p.lng || 0), 0) / arr.length;
          c = { lat, lng, zoom: arr.length === 1 ? 14 : 12 };
        }
        setCenter(c || null);

        // pecah titik yang bertumpuk
        setPoints(spreadCoinciding(arr));
      })
      .catch(() => {
        if (alive) {
          setPoints([]);
          setCenter(null);
          setMeta(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [sector, selectedCell, siteKey, dateRange]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="text-lg font-bold text-white/90 tracking-wide">
          MAPS
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-md bg-amber-400/90" />
        </div>
      </div>

      <div className="p-3">
        <div className="relative rounded-2xl bg-neutral-900 h-[420px] md:h-[440px] overflow-hidden">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-white/70 z-[400]">
            {dateRange.start || "—"} – {dateRange.end || "—"}
          </div>

          {!mounted ? (
            <div className="h-full grid place-items-center text-white/60">
              …
            </div>
          ) : !sector || !selectedCell ? (
            <div className="h-full grid place-items-center text-white/60 px-4 text-center">
              Pilih sector dan cell terlebih dahulu.
            </div>
          ) : !center ? (
            <div className="h-full grid place-items-center text-white/60">
              Koordinat belum tersedia
            </div>
          ) : (
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={center.zoom || 12}
              zoomControl={false}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              />
              {points.map((p, i) => {
                if (p.lat == null || p.lng == null) return null;
                const pos = [Number(p.lat), Number(p.lng)];
                const latS = Number(p.lat).toFixed(5),
                  lngS = Number(p.lng).toFixed(5);
                return (
                  <Marker
                    key={`${p.site_id || i}-${p._jittered ? "j" : ""}`}
                    position={pos}
                    icon={p.selected ? triArrowIcon : dotIcon("#06b6d4", 11)}
                    zIndexOffset={p.selected ? 1000 : 0}
                    eventHandlers={{
                      mouseover: (e) => e.target.openPopup(),
                      mouseout: (e) => e.target.closePopup(),
                    }}
                  >
                    <Tooltip
                      direction="top"
                      offset={[0, -10]}
                      opacity={1}
                      sticky
                    >
                      <div className="text-xs font-semibold">
                        {p.name || p.site_id}
                      </div>
                    </Tooltip>
                    <Popup>
                      <div className="text-sm font-semibold">
                        {p.name || p.site_id}
                      </div>
                      <div className="text-xs opacity-80">
                        Site ID: <b>{p.site_id}</b>
                      </div>
                      {p.cells != null && (
                        <div className="text-xs opacity-80">
                          Cells: <b>{p.cells}</b>
                        </div>
                      )}
                      <div className="text-[11px] opacity-70 mt-1">
                        Lat: {latS}, Lng: {lngS}
                      </div>
                      {p.selected && (
                        <div className="text-xs text-amber-400 mt-1 font-semibold">
                          Site Group (terpilih)
                        </div>
                      )}
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}
