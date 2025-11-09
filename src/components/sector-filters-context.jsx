"use client";
import { createContext, useContext, useMemo, useState } from "react";
const Ctx = createContext(null);

export function SectorFiltersProvider({ children }) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth()+1).padStart(2,"0");
  const dd = String(now.getDate()).padStart(2,"0");

  const [sector, setSector] = useState("");
  const [cells, setCells] = useState([]);
  const [dateRange, setDateRange] = useState({ start: `${yyyy}-${mm}-01`, end: `${yyyy}-${mm}-${dd}` });

  const value = useMemo(() => ({ sector, setSector, cells, setCells, dateRange, setDateRange }), [sector, cells, dateRange]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useSectorFilters(){ const v=useContext(Ctx); if(!v) throw new Error(); return v; }
