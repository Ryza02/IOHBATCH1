"use client";
import { useEffect, useState } from "react";
import { useSectorFilters } from "@/components/sector-filters-context";

export default function SectorFilterBar(){
  const { sectors, setSectors, sas, setSas, startDate, setStartDate, endDate, setEndDate } = useSectorFilters();
  const [opts, setOpts] = useState({ sectors: [], sas: [] });

  useEffect(() => {
    fetch("/api/sector/options").then(r=>r.json()).then(setOpts);
  }, []);

  return (
    <div className="flex flex-wrap gap-2 items-center mb-3">
      <input type="date" value={startDate||""} onChange={(e)=>setStartDate(e.target.value)} className="px-2 py-1 rounded-md bg-white/10 border border-white/20" />
      <input type="date" value={endDate||""} onChange={(e)=>setEndDate(e.target.value)} className="px-2 py-1 rounded-md bg-white/10 border border-white/20" />

      <select multiple value={sectors} onChange={(e)=>setSectors(Array.from(e.target.selectedOptions).map(o=>o.value))} className="min-w-40 px-2 py-1 rounded-md bg-white/10 border border-white/20">
        {opts.sectors.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select multiple value={sas} onChange={(e)=>setSas(Array.from(e.target.selectedOptions).map(o=>o.value))} className="min-w-40 px-2 py-1 rounded-md bg-white/10 border border-white/20">
        {opts.sas.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}
