"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { useSectorFilters } from "./sector-filters-context";

const palette = [
  { stroke: "#8b5cf6", fill: "url(#lvA1)" },
  { stroke: "#22d3ee", fill: "url(#lvA2)" },
  { stroke: "#f472b6", fill: "url(#lvA3)" },
  { stroke: "#f59e0b", fill: "url(#lvA4)" },
  { stroke: "#34d399", fill: "url(#lvA5)" },
  { stroke: "#60a5fa", fill: "url(#lvA6)" },
  { stroke: "#eab308", fill: "url(#lvA7)" },
];

function Defs() {
  return (
    <defs>
      {["#8b5cf6","#22d3ee","#f472b6","#f59e0b","#34d399","#60a5fa","#eab308"].map((c,i)=>(
        <linearGradient key={i} id={`lvA${i+1}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={c} stopOpacity={0.35} />
          <stop offset="95%" stopColor={c} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  );
}

export default function SectorLevelMetric({ metric = "eut", className = "" }) {
  const { sectorFilters } = useSectorFilters();
  const focus = sectorFilters?.focus || null; // { siteId, sector }
  const [data, setData] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  const depKey = useMemo(() => {
    return [
      metric,
      focus?.siteId || "",
      focus?.sector || "",
      sectorFilters?.startDate || "",
      sectorFilters?.endDate || ""
    ].join("|");
  }, [metric, focus, sectorFilters?.startDate, sectorFilters?.endDate]);

  useEffect(() => {
    if (!focus?.siteId || !focus?.sector || !sectorFilters?.startDate || !sectorFilters?.endDate) {
      setData([]); setSeries([]); return;
    }

    let abort = false;
    const qs = new URLSearchParams({
      metric,
      sector: String(focus.sector),
      siteId: String(focus.siteId),
      startDate: sectorFilters.startDate,
      endDate: sectorFilters.endDate,
    });

    setLoading(true);
    fetch(`/api/sector/metric?${qs.toString()}`)
      .then(r => r.json())
      .then(j => {
        if (abort) return;
        const rows = Array.isArray(j?.data) ? j.data : [];

        // pivot: date → { date, [cellName]: value }
        const byDate = new Map();
        const names = new Set();
        for (const r of rows) {
          const d = (r.date || "").slice(0,10);
          if (!d) continue;
          if (!byDate.has(d)) byDate.set(d, { date: d });
          byDate.get(d)[r.series] = Number(r.value || 0);
          names.add(r.series);
        }

        const pivot = Array.from(byDate.values()).sort((a,b)=>a.date.localeCompare(b.date));
        setData(pivot);
        setSeries(Array.from(names));
      })
      .finally(()=>setLoading(false));

    return () => { abort = true; };
  }, [depKey]);

  const colorMap = useMemo(() => {
    const m = new Map();
    series.forEach((s, i) => m.set(s, palette[i % palette.length]));
    return m;
  }, [series]);

  const title =
    focus?.siteId && focus?.sector
      ? `${metric.toUpperCase()} – Site ${focus.siteId} · Sector ${focus.sector}`
      : `${metric.toUpperCase()} – pilih site+sector dari peta`;

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-6 ${className}`}>
      <h3 className="text-white font-semibold mb-3">{title}</h3>

      <div className="h-[360px] rounded-xl bg-gradient-to-b from-white/3 to-transparent p-3">
        {!focus?.siteId || !focus?.sector ? (
          <div className="grid place-items-center text-gray-400 h-full">Klik marker di peta untuk memilih site+sector.</div>
        ) : loading ? (
          <div className="grid place-items-center text-gray-400 h-full">Memuat…</div>
        ) : !data.length ? (
          <div className="grid place-items-center text-gray-400 h-full">Tidak ada data.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: -6, bottom: 6 }}>
              <Defs />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d)=>
                  new Intl.DateTimeFormat("id-ID",{ day:"numeric", month:"short", timeZone:"UTC" })
                    .format(new Date(d))
                }
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(139,92,246,0.08)" }}
                formatter={(v, name)=>[Number(v||0).toLocaleString("id-ID"), name]}
                labelFormatter={(d)=> new Intl.DateTimeFormat("id-ID",{ dateStyle:"long", timeZone:"UTC" }).format(new Date(d))}
              />
              <Legend />
              {series.map((name, i) => {
                const c = colorMap.get(name) || palette[i % palette.length];
                return (
                  <g key={name}>
                    <Area type="monotone" dataKey={name} name={name} stroke="none" fill={c.fill} />
                    <Line type="monotone" dataKey={name} name={name} stroke={c.stroke} strokeWidth={2.2} dot={{ r: 2.2 }} />
                  </g>
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
