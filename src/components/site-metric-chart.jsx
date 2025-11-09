"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ComposedChart, Line, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

/* warna tak terbatas */
const basePalette = ["#38bdf8","#f472b6","#a78bfa","#22d3ee","#f59e0b","#34d399","#fb7185","#60a5fa"];
const colorAt = i => i < basePalette.length ? basePalette[i] : `hsl(${(i*47)%360} 85% 62%)`;

/* tooltip anti-duplikat */
function DedupTooltip({ active, label, payload, colorMap }) {
  if (!active || !payload?.length) return null;
  const by = new Map();
  for (const p of payload) {
    const prev = by.get(p.dataKey);
    if (!prev || (!!p.stroke && !prev.stroke)) by.set(p.dataKey, p);
  }
  const items = [...by.values()];
  const fmt = new Intl.DateTimeFormat("id-ID",{dateStyle:"long",timeZone:"UTC"}).format(new Date(label));
  return (
    <div className="rounded-xl border border-white/10 bg-[#111827]/90 px-3 py-2">
      <div className="text-[11px] text-gray-200 mb-1">Tanggal: {fmt}</div>
      <div className="grid gap-1">
        {items.map((p,i)=>(
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="inline-block rounded-full" style={{width:9,height:9,background: colorMap.get(p.dataKey)||p.stroke}}/>
            <span className="text-gray-100 font-semibold">
              {p.name?.split("(")[0].trim()} : {Number(p.value??0).toLocaleString("id-ID",{maximumFractionDigits:2})}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* legend adaptif */
function LegendPanel({ series, colorMap, canShowAll, onShowAll, showingAll }) {
  const LIMIT=18; const many = series.length>LIMIT && !showingAll;
  const shown = many ? series.slice(0,LIMIT) : series;
  return (
    <div className="pt-2">
      <div className="grid gap-x-4 gap-y-2" style={{gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))"}}>
        {shown.map((s,i)=>(
          <div key={s+i} className="flex items-center gap-2 min-w-0">
            <span style={{background:colorMap.get(s),width:12,height:12,borderRadius:"50%"}}/>
            <span className="text-[11px] text-gray-300 truncate" title={s}>{s}</span>
          </div>
        ))}
      </div>
      {many && canShowAll && (
        <div className="text-center mt-2">
          <button onClick={onShowAll} className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white/90">
            Tampilkan semua ({series.length})
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteMetricChart({ title, qs, height=420, initialLimit=24 }) {
  const [data, setData] = useState([]); const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  const [showAll, setShowAll] = useState(false);
  const controllerRef = useRef(null); const timeoutRef = useRef(null);

  // ⛳ FIX: qs = pure query-string tanpa '?', maka SELALU pakai "&limitSeries="
  const effectiveQs = useMemo(() => {
    if (!qs) return null;
    const limit = showAll ? 0 : (initialLimit ?? 24);
    return `${qs}&limitSeries=${limit}`;
  }, [qs, showAll, initialLimit]);

  useEffect(() => {
    if (!effectiveQs) { setData([]); setSeries([]); setErr(""); setLoading(false); return; }

    controllerRef.current?.abort();
    const ac = new AbortController(); controllerRef.current = ac;

    setLoading(true); setErr("");
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(()=>{ setLoading(false); setErr("Lambat merespons. Coba ulangi / persempit filter."); }, 8000);

    fetch(`/api/sector/chart?${effectiveQs}`, { signal: ac.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => {
        const labels = d.labels || []; const ds = d.datasets || [];
        const rows = labels.map((date,i) => { const obj = { date }; ds.forEach(s=>obj[s.label]=s.data[i]); return obj; });
        setSeries(ds.map(s=>s.label)); setData(rows);
      })
      .catch(e => { if (e.name!=="AbortError") setErr(e.message||"Gagal mengambil data"); })
      .finally(()=>{ clearTimeout(timeoutRef.current); setLoading(false); });

    return () => { ac.abort(); clearTimeout(timeoutRef.current); };
  }, [effectiveQs]);

  const colorMap = useMemo(()=>{ const m=new Map(); series.forEach((s,i)=>m.set(s,colorAt(i))); return m; },[series]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-6">
      <div className="text-white font-bold tracking-wider mb-3">{title}</div>

      {!qs ? (
        <div className="grid place-items-center text-gray-400" style={{height}}>Pilih sector &amp; cell dulu.</div>
      ) : loading ? (
        <div className="grid place-items-center text-gray-400" style={{height}}>Memuat data…</div>
      ) : err ? (
        <div className="grid place-items-center text-rose-300 text-sm text-center" style={{height}}>{err}</div>
      ) : !data.length ? (
        <div className="grid place-items-center text-gray-400" style={{height}}>Tidak ada data.</div>
      ) : (
        <>
          <div className="w-full rounded-xl bg-gradient-to-b from-white/3 to-transparent p-2">
            <ResponsiveContainer width="100%" height={height}>
              <ComposedChart data={data} margin={{ top:10, right:12, left:-6, bottom:8 }}>
                <defs>
                  {series.map((_,i)=> {
                    const c=colorAt(i); const id=`g_${i}`;
                    return (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c} stopOpacity={0.28}/>
                        <stop offset="95%" stopColor={c} stopOpacity={0}/>
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date"
                  tickFormatter={d=> new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(d))}
                  tick={{ fill:"rgba(255,255,255,0.6)", fontSize:12 }} axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={v=> Number(v).toLocaleString("id-ID")}
                  tick={{ fill:"rgba(255,255,255,0.6)", fontSize:12 }} axisLine={false} tickLine={false}
                />
                <Tooltip content={<DedupTooltip colorMap={colorMap}/>} cursor={{ fill:"rgba(167,139,250,0.08)" }} />
                {series.map((s,i)=>(
                  <g key={s}>
                    <Area type="monotone" dataKey={s} fill={`url(#g_${i})`} stroke="none" isAnimationActive/>
                    <Line type="monotone" dataKey={s} stroke={colorAt(i)} strokeWidth={2.6} dot={{ r:2.3 }} activeDot={{ r:4 }} name={s} isAnimationActive/>
                  </g>
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <LegendPanel series={series} colorMap={colorMap} canShowAll={!showAll} showingAll={showAll} onShowAll={()=>setShowAll(true)} />
        </>
      )}
    </div>
  );
}
