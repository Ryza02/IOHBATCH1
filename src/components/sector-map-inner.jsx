// src/components/sector-map-inner.jsx
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { useSectorFilters } from "./sector-filters-context";

function arrowIcon(deg = 0) {
  const svg = `
    <svg viewBox="0 0 32 32" width="28" height="28" style="transform: rotate(${deg}deg);">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="rgba(0,0,0,0.45)"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <circle cx="16" cy="16" r="7" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.5)"/>
        <path d="M16 4 L22 18 L16 15 L10 18 Z" fill="#8b5cf6"/>
      </g>
    </svg>
  `;
  return L.divIcon({ className: "sector-arrow", html: svg, iconSize: [28,28], iconAnchor: [14,14] });
}

function MapEffects({ flyTarget }) {
  const map = useMap();
  useEffect(() => {
    if (!flyTarget) return;
    const { lat, lng, zoom = 15 } = flyTarget;
    map.flyTo([lat, lng], zoom, { duration: 0.8 });
  }, [flyTarget, map]);
  return null;
}

export function SectorLeafletInner({ onPickSector }) {
  const { sectorFilters } = useSectorFilters();
  const [markers, setMarkers] = useState([]);
  const [flyTarget, setFlyTarget] = useState(null);

  const qs = useMemo(() => {
    const q = new URLSearchParams();
    (sectorFilters.selectedSectors || []).forEach(s => q.append("sector[]", String(s.value)));
    if (sectorFilters.startDate) q.set("startDate", sectorFilters.startDate);
    if (sectorFilters.endDate) q.set("endDate", sectorFilters.endDate);
    return q.toString();
  }, [sectorFilters]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/sector/map?${qs}`);
        const j = await res.json();
        if (!alive) return;
        const arr = j?.markers || j?.data || [];
        setMarkers(arr);
        // center awal
        if (arr.length && !flyTarget) setFlyTarget({ lat: arr[0].lat, lng: arr[0].lng, zoom: 11 });
      } catch (e) {
        console.error("Error load markers:", e);
      }
    })();
    return () => { alive = false; };
  }, [qs]); 

  const center = markers.length ? [markers[0].lat, markers[0].lng] : [-6.1754, 106.8272];

  return (
    <>
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: rgba(15,23,42,0.95);
          color: #e5e7eb;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.12);
        }
        .leaflet-popup-tip { background: rgba(15,23,42,.95); }
        .sector-arrow { transition: transform .2s ease; }
      `}</style>

      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
        <MapEffects flyTarget={flyTarget} />

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />

        {markers.map((m, i) => (
          <Marker
            key={`${m.site_id || m.sector}-${i}`}
            position={[m.lat, m.lng]}
            icon={arrowIcon(Number(m.azimuth || 0))}
            eventHandlers={{
              click: () => {
                setFlyTarget({ lat: m.lat, lng: m.lng, zoom: 15 });
                onPickSector?.({ sector: m.sector, siteId: m.site_id });
              },
            }}
          >
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.3 }}>
                <div style={{ fontWeight: 700 }}>Sector {m.sector}</div>
                {m.site_id && <div>Site: {m.site_id}</div>}
                {m.count != null && <div>Samples: {m.count}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
