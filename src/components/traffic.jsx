"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import SiteSelect from "@/components/site-select";
import { useFilters } from "@/components/filters-context";

const siteColors = [
  { stroke: "#3b82f6", areaFill: "url(#colorArea1)" },
  { stroke: "#ec4899", areaFill: "url(#colorArea2)" },
  { stroke: "#a78bfa", areaFill: "url(#colorArea3)" },
];

function DedupTooltip({ active, payload, label, colorMap }) {
  if (!active || !payload || payload.length === 0) return null;

  const byKey = new Map();
  payload.forEach((p) => {
    const prev = byKey.get(p.dataKey);
    if (!prev) {
      byKey.set(p.dataKey, p);
    } else {
      const preferThis =
        p.type === "line" ||
        (p.color && !prev.color) ||
        (p.stroke && !prev.stroke);
      if (preferThis) byKey.set(p.dataKey, p);
    }
  });
  const items = Array.from(byKey.values());

  const fmtDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(label));
  const fmtVal = (v) =>
    `${Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 })} GB`;

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
        {items.map((it, idx) => {
          const color =
            (colorMap && colorMap.get(it.dataKey)) ||
            it.color ||
            it.stroke ||
            "#9ca3af";
          return (
            <div
              key={it.dataKey}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: color,
                  border: idx === 0 ? "1.5px solid #fff" : "none",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color,
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {it.name?.split("(")[0].trim()} : {fmtVal(it.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Traffic() {
  const { filters, setFilters } = useFilters();

  const [mounted, setMounted] = useState(false); // guard anti hydration
  const [siteOptions, setSiteOptions] = useState([]);
  const [selectedSites, setSelectedSites] = useState([]);
  const [dateRange, setDateRange] = useState({ min: "", max: "" });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  // initial fetch meta (client only)
  useEffect(() => {
    let alive = true;
    fetch("/api/traffic")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const sites = d.sites || [];
        const def = d.defaultSites?.slice(0, 3) ?? sites.slice(0, 3);

        setSiteOptions(sites);
        setSelectedSites(def);
        setDateRange({ min: d.minDate, max: d.maxDate });

        const end = d.maxDate;
        const s = new Date(end);
        s.setDate(s.getDate() - 11);
        const sStr = s.toISOString().slice(0, 10);

        setStartDate(sStr);
        setEndDate(end);
        setFilters({ startDate: sStr, endDate: end, selectedSites: def });
      });
    return () => {
      alive = false;
    };
  }, [setFilters]);

  // re-fetch data saat filter berubah
  const depKey = useMemo(() => {
    const s = selectedSites.map((o) => o.value).join(",");
    return `${s}|${startDate}|${endDate}`;
  }, [selectedSites, startDate, endDate]);

  useEffect(() => {
    if (!mounted) return;
    if (!startDate || !endDate || selectedSites.length === 0) return;
    let alive = true;
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      selectedSites.forEach((site) =>
        params.append("siteenodeb[]", site.value)
      );
      params.append("startDate", startDate);
      params.append("endDate", endDate);

      setLoading(true);
      fetch(`/api/traffic?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => alive && setChartData(d.data ?? []))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [depKey, mounted]);

  /* ===== Gradients ===== */
  const GradientDefs = () => (
    <defs>
      <linearGradient id="colorArea1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorArea2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorArea3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.28} />
        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
      </linearGradient>
    </defs>
  );

  /* ===== Range guard (maks 90 hari) ===== */
  const MAX_RANGE = 90;
  const clampStart = (val) => {
    const end = new Date(endDate || dateRange.max);
    const maxStart = new Date(end);
    maxStart.setDate(maxStart.getDate() - (MAX_RANGE - 1));
    const s = new Date(val);
    return (s < maxStart ? maxStart : s).toISOString().slice(0, 10);
  };

  function handleDateChange(val, type) {
    if (!val) return;
    if (type === "start") {
      const v = clampStart(val);
      const next = v > endDate ? endDate : v;
      setStartDate(next);
      setFilters({ ...filters, startDate: next });
    } else {
      const e = new Date(val) < new Date(startDate) ? startDate : val;
      setEndDate(e);
      setFilters({ ...filters, endDate: e });
    }
  }

  /* ===== Legend custom: render dari selectedSites + siteColors (no duplicate) ===== */
  const renderLegend = () => {
    const items = selectedSites.map((s, idx) => ({
      label: s.label.split(" (")[0].trim(),
      color: siteColors[idx % siteColors.length].stroke,
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

  /* ===== colorMap untuk sinkron warna tooltip & legend ===== */
  const colorMap = useMemo(() => {
    const m = new Map();
    selectedSites.forEach((s, idx) =>
      m.set(s.label, siteColors[idx % siteColors.length].stroke)
    );
    return m;
  }, [selectedSites]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-4 md:p-6 overflow-hidden">
      <div className="mb-4 flex items-start justify-between gap-2">
        <h2 className="text-white text-lg md:text-xl font-bold tracking-wider">
          TRAFFIC
        </h2>

        <div className="w-full sm:w-[420px] md:w-[460px]">
          <div className="flex items-center gap-2 mb-2 justify-end">
            <input
              type="date"
              value={startDate}
              min={dateRange.min}
              max={endDate || dateRange.max}
              onChange={(e) => handleDateChange(e.target.value, "start")}
              className="h-8 w-[110px] rounded-md border border-white/15 bg-[#22263a] text-white text-[11px] px-2"
            />
            <span className="text-white/60 text-xs">–</span>
            <input
              type="date"
              value={endDate}
              min={startDate || dateRange.min}
              max={dateRange.max}
              onChange={(e) => handleDateChange(e.target.value, "end")}
              className="h-8 w-[110px] rounded-md border border-white/15 bg-[#22263a] text-white text-[11px] px-2"
            />
          </div>

          <div className="w-full md:w-auto ml-auto">
            <SiteSelect
              className="w-[280px] md:w-[300px] ml-auto"
              options={siteOptions}
              value={selectedSites}
              onChange={(v) => {
                setSelectedSites(v);
                setFilters({ ...filters, selectedSites: v });
              }}
              max={3}
            />
          </div>
        </div>
      </div>

      {!mounted ? (
        <div className="h-[360px] grid place-items-center text-gray-500/60">…</div>
      ) : loading ? (
        <div className="h-[360px] grid place-items-center text-gray-400">Memuat data…</div>
      ) : !chartData?.length ? (
        <div className="h-[360px] grid place-items-center text-gray-400">
          Tidak ada data untuk filter ini.
        </div>
      ) : (
        <div className="w-full rounded-xl bg-gradient-to-b from-white/3 to-transparent p-3">
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 12, left: -6, bottom: 6 }}
            >
              <GradientDefs />
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.08)"
              />
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
                tickFormatter={(v) => Number(v).toLocaleString("id-ID")}
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              {/* Tooltip anti duplikat + warna sinkron */}
              <Tooltip
                cursor={{ fill: "rgba(167,139,250,0.08)" }}
                content={<DedupTooltip colorMap={colorMap} />}
              />

              {/* Legend tanpa duplikasi dan warna selalu benar */}
              <Legend content={renderLegend} />

              {/* Area (fill) + Line (stroke) untuk setiap site */}
              {selectedSites.map((site, idx) => {
                const c = siteColors[idx % siteColors.length];
                return (
                  <g key={site.value}>
                    <Area
                      type="monotone"
                      dataKey={site.label}
                      fill={c.areaFill}
                      stroke="none"
                      isAnimationActive
                    />
                    <Line
                      type="monotone"
                      dataKey={site.label}
                      stroke={c.stroke}
                      strokeWidth={2.6}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 4 }}
                      name={site.label}
                      isAnimationActive
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
