"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import SiteSelect from "@/components/site-select";
import { useFilters } from "@/components/filters-context";

/* Warna per seri (stroke & gradient fill) */
const colors = [
  { stroke: "#22c55e", areaFill: "url(#avA1)" }, // hijau
  { stroke: "#f59e0b", areaFill: "url(#avA2)" }, // oranye
  { stroke: "#38bdf8", areaFill: "url(#avA3)" }, // biru
];

export default function Availability() {
  const { linked, setLinked, filters } = useFilters();

  const [siteOptions, setSiteOptions] = useState([]);
  const [dateRange, setDateRange] = useState({ min: "", max: "" });

  const [localStart, setLocalStart] = useState("");
  const [localEnd, setLocalEnd] = useState("");
  const [localSites, setLocalSites] = useState([]);

  const startDate = linked ? filters.startDate || "" : localStart;
  const endDate   = linked ? filters.endDate   || "" : localEnd;
  const sitesSel  = linked ? filters.selectedSites || [] : localSites;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  /* --- Init options & default filter --- */
  useEffect(() => {
    let alive = true;
    fetch("/api/availability")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setSiteOptions(d.sites || []);
        setDateRange({ min: d.minDate, max: d.maxDate });

        if (!linked && !localStart && !localEnd && localSites.length === 0) {
          const end = d.maxDate;
          const s = new Date(end);
          s.setDate(s.getDate() - 11);
          setLocalStart(s.toISOString().slice(0, 10));
          setLocalEnd(end);
          setLocalSites((d.sites || []).slice(0, 3));
        }
      });
    return () => { alive = false; };
  }, [linked]);

  function toggleLink() {
    if (linked) {
      if (filters.startDate && filters.endDate && (filters.selectedSites || []).length) {
        setLocalStart(filters.startDate);
        setLocalEnd(filters.endDate);
        setLocalSites(filters.selectedSites);
      }
      setLinked(false);
    } else {
      setLinked(true);
    }
  }

  /* --- Fetch data saat filter berubah --- */
  const depKey = useMemo(
    () => `${sitesSel.map((s) => s.value).join(",")}|${startDate}|${endDate}`,
    [sitesSel, startDate, endDate]
  );

  useEffect(() => {
    if (!startDate || !endDate || sitesSel.length === 0) return;
    let alive = true;
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      sitesSel.forEach((s) => qs.append("siteenodeb[]", s.value));
      qs.append("startDate", startDate);
      qs.append("endDate", endDate);

      setLoading(true);
      fetch(`/api/availability?${qs.toString()}`)
        .then((r) => r.json())
        .then((d) => alive && setData(d.data || []))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [depKey]);

  const disabledCls = linked ? "opacity-60 cursor-not-allowed" : "";

  /* === Map dataKey -> warna stroke (untuk legend & tooltip) === */
  const colorMap = useMemo(() => {
    const m = new Map();
    sitesSel.forEach((s, idx) => m.set(s.label, colors[idx % colors.length].stroke));
    return m;
  }, [sitesSel]);

  /* === Tooltip custom: dedup Area+Line, pakai warna dari colorMap === */
  function DedupTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0) return null;

    // Dedup by dataKey, prioritaskan Line (punya color/stroke valid)
    const byKey = new Map();
    payload.forEach((p) => {
      const prev = byKey.get(p.dataKey);
      if (!prev) byKey.set(p.dataKey, p);
      else if (p.type === "line" || (p.color && !prev.color) || (p.stroke && !prev.stroke)) {
        byKey.set(p.dataKey, p);
      }
    });
    const items = Array.from(byKey.values());

    const fmtDate = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(label));

    return (
      <div
        style={{
          background: "rgba(17,24,39,0.9)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "10px 12px",
        }}
      >
        <div style={{ color: "#e5e7eb", fontSize: 12, marginBottom: 6 }}>
          Tanggal: {fmtDate}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {items.map((it) => {
            const color = colorMap.get(it.dataKey) || it.color || it.stroke || "#9ca3af";
            return (
              <div key={it.dataKey} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color, fontWeight: 700, fontSize: 12 }}>
                  {it.name?.split("(")[0].trim()} : {`${Number(it.value).toFixed(2)} %`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* Legend: bangun dari sitesSel + colors => no duplicate, warna konsisten */
  const renderLegend = () => {
    const items = sitesSel.map((s, idx) => ({
      label: s.label.split(" (")[0].trim(),
      color: colors[idx % colors.length].stroke,
      idx,
    }));
    return (
      <div className="flex items-center justify-center gap-x-4 gap-y-2 flex-wrap pt-3">
        {items.map((it) => (
          <div key={`lg-${it.label}`} className="flex items-center gap-2">
            <span
              style={{
                background: it.color,
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: it.idx === 0 ? "1.6px solid #fff" : "none",
              }}
            />
            <span className="text-[11px] text-gray-300">{it.label}</span>
          </div>
        ))}
      </div>
    );
  };

  /* Gradients */
  const Defs = () => (
    <defs>
      <linearGradient id="avA1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.30} />
        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="avA2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="avA3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.28} />
        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
      </linearGradient>
    </defs>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-6 overflow-hidden">
      <div className="mb-4 flex items-start justify-between gap-2">
        <h2 className="text-white text-lg md:text-xl font-bold tracking-wider">AVAILABILITY</h2>

        <div className="w-full sm:w-[420px] md:w-[460px]">
          <div className="flex items-center gap-2 mb-2 justify-end">
            <input
              type="date"
              value={startDate}
              min={dateRange.min}
              max={endDate || dateRange.max}
              onChange={(e) => !linked && setLocalStart(e.target.value)}
              disabled={linked}
              className={`h-8 w-[110px] rounded-md border border-white/15 bg-[#22263a] text-white text-[11px] px-2 ${linked ? "opacity-60 cursor-not-allowed" : ""}`}
            />
            <span className="text-white/60 text-xs">–</span>
            <input
              type="date"
              value={endDate}
              min={startDate || dateRange.min}
              max={dateRange.max}
              onChange={(e) => !linked && setLocalEnd(e.target.value)}
              disabled={linked}
              className={`h-8 w-[110px] rounded-md border border-white/15 bg-[#22263a] text-white text-[11px] px-2 ${linked ? "opacity-60 cursor-not-allowed" : ""}`}
            />
            <button
              onClick={toggleLink}
              className={`ml-2 h-8 px-3 rounded-md border text-xs ${
                linked ? "bg-emerald-600/80 border-emerald-500 text-white"
                       : "bg-[#22263a] border-white/15 text-white/80"
              }`}
            >
              {linked ? "Linked" : "Unlinked"}
            </button>
          </div>

          <div className="w-full md:w-auto ml-auto">
            <SiteSelect
              className="w-[280px] md:w-[300px] ml-auto"
              disabled={linked}
              options={siteOptions}
              value={sitesSel}
              onChange={(v) => !linked && setLocalSites(v)}
              max={3}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[360px] grid place-items-center text-gray-400">Memuat data…</div>
      ) : !data?.length ? (
        <div className="h-[360px] grid place-items-center text-gray-400">Tidak ada data.</div>
      ) : (
        <div className="w-full rounded-xl bg-gradient-to-b from-white/3 to-transparent p-3">
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: -6, bottom: 6 }}>
              <Defs />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) =>
                  new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  }).format(new Date(d))
                }
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />

              {/* Tooltip pakai warna dari colorMap */}
              <Tooltip cursor={{ fill: "rgba(34,197,94,0.08)" }} content={<DedupTooltip />} />

              {/* Legend konsisten, tanpa duplikasi */}
              <Legend content={renderLegend} />

              {/* Render setiap site: Area (fill) + Line (stroke) */}
              {sitesSel.map((s, idx) => {
                const c = colors[idx % colors.length];
                return (
                  <g key={s.value}>
                    <Area type="monotone" dataKey={s.label} fill={c.areaFill} stroke="none" />
                    <Line
                      type="monotone"
                      dataKey={s.label}
                      stroke={c.stroke}
                      strokeWidth={2.4}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 4 }}
                      name={s.label}
                    />
                  </g>
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
