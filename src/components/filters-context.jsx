"use client";
import { createContext, useContext, useState, useMemo } from "react";

const FiltersCtx = createContext(null);

export function FiltersProvider({ children }) {
  const [linked, setLinked] = useState(true);
  const [filters, setFilters] = useState({
    startDate: "", endDate: "", selectedSites: [], // {label,value}[]
  });

  const value = useMemo(() => ({ linked, setLinked, filters, setFilters }), [linked, filters]);
  return <FiltersCtx.Provider value={value}>{children}</FiltersCtx.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersCtx);
  if (!ctx) throw new Error("useFilters must be used inside <FiltersProvider>");
  return ctx;
}
