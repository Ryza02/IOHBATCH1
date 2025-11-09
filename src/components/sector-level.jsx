"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SectorMap from "@/components/sector-map";
import SiteMetricChart from "@/components/site-metric-chart";
import SearchableSelect from "@/components/ui/Searchableselect";
import { useSectorFilters } from "@/components/sector-filters-context";

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold text-white/70">{label}</div>
      {children}
    </div>
  );
}

export default function SectorLevel() {
  const { sector, setSector, cells, setCells, dateRange, setDateRange } = useSectorFilters();

  const [sectors, setSectors] = useState([]);
  const [cellOptions, setCellOptions] = useState([]);
  const [minMax, setMinMax] = useState({ min: "", max: "" });
  const [loadingCells, setLoadingCells] = useState(false);

  // ⛳ guard supaya default tanggal dari DB hanya di-set sekali
  const initRef = useRef(false);
  const userTouchedStart = useRef(false);
  const userTouchedEnd = useRef(false);

  // META: ambil sectors + default range dari DB (MAX(Date)-6 .. MAX(Date))
  useEffect(() => {
    let alive = true;
    fetch("/api/sector/meta", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setSectors((d.sectors || []).map((s) => ({ label: s, value: s })));
        setMinMax({ min: d.minDate, max: d.maxDate });

        // Force pakai last-7-days dari DB hanya sekali, atau kalau range kosong
        if (!initRef.current || !dateRange.start || !dateRange.end) {
          setDateRange({
            start: d.defaultStart || d.maxDate,
            end: d.defaultEnd || d.maxDate,
          });
          initRef.current = true;
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ambil cellnames setelah sector dipilih
  useEffect(() => {
    if (!sector) {
      setCellOptions([]);
      setCells([]);
      return;
    }
    let alive = true;
    setLoadingCells(true);
    fetch(`/api/sector/cellnames?sector=${encodeURIComponent(sector)}`)
      .then((r) => r.json())
      .then((d) => alive && setCellOptions((d.cells || []).map((c) => ({ label: c, value: c }))))
      .finally(() => alive && setLoadingCells(false));
    return () => {
      alive = false;
    };
  }, [sector, setCells]);

  const selectedCell = cells[0] || "";
  const siteKey = useMemo(() => {
    if (!selectedCell) return "";
    const t = selectedCell.split("_");
    return t.find((x) => /^[A-Za-z]+$/.test(x) && x.length >= 4) || t[0];
  }, [selectedCell]);

  const qsBase = useMemo(() => {
    if (!sector || !selectedCell || !siteKey || !dateRange.start || !dateRange.end) return null;
    return `sector=${encodeURIComponent(sector)}&mode=site&site=${encodeURIComponent(
      siteKey
    )}&start=${dateRange.start}&end=${dateRange.end}`;
  }, [sector, selectedCell, siteKey, dateRange]);

  return (
    <div className="space-y-4">
      {/* FILTERS */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
        <div className="grid xl:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-3 relative z-[50]">
          <Field label="MAPS / Sector">
            <SearchableSelect
              options={sectors}
              value={sector || ""}
              onChange={(v) => {
                setSector(v);
                setCells([]); // reset cell saat ganti sector
              }}
              placeholder="Pilih Sector"
              className="z-[60]"
            />
          </Field>

          <Field label="Cell (penentu Site Group)">
            <SearchableSelect
              options={cellOptions}
              value={selectedCell || ""}
              onChange={(v) => setCells(v ? [v] : [])}
              placeholder={loadingCells ? "Memuat cell…" : "Pilih Cell"}
              className="z-[60]"
            />
          </Field>

          <Field label="Tanggal Mulai">
            <input
              type="date"
              value={dateRange.start || ""}
              min={minMax.min || ""}
              max={dateRange.end || minMax.max || ""}
              onChange={(e) => {
                userTouchedStart.current = true;
                const v = e.target.value;
                if (!v) return;
                if (new Date(v) > new Date(dateRange.end || minMax.max)) return;
                setDateRange({ ...dateRange, start: v });
              }}
              className="h-10 w-full rounded-lg border border-white/15 bg-[#22263a] text-white text-sm px-3"
            />
          </Field>

          <Field label="Tanggal Akhir">
            <input
              type="date"
              value={dateRange.end || ""}
              min={dateRange.start || minMax.min || ""}
              max={minMax.max || ""}
              onChange={(e) => {
                userTouchedEnd.current = true;
                const v = e.target.value;
                if (v) setDateRange({ ...dateRange, end: v });
              }}
              className="h-10 w-full rounded-lg border border-white/15 bg-[#22263a] text-white text-sm px-3"
            />
          </Field>
        </div>
      </div>

      {/* MAPS */}
      <SectorMap />

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ gridAutoRows: "minmax(420px,auto)" }}>
        <SiteMetricChart title="User"             qs={qsBase ? `${qsBase}&metric=user`  : null} height={420} />
        <SiteMetricChart title="EUT / Throughput" qs={qsBase ? `${qsBase}&metric=eut`   : null} height={420} />
        <SiteMetricChart title="CQI"              qs={qsBase ? `${qsBase}&metric=cqi`   : null} height={420} />
        <SiteMetricChart title="Rank2 (%)"        qs={qsBase ? `${qsBase}&metric=rank2` : null} height={420} />
        <SiteMetricChart title="PRB"              qs={qsBase ? `${qsBase}&metric=prb`   : null} height={420} />
        <SiteMetricChart title="UL Interference"  qs={qsBase ? `${qsBase}&metric=ulint` : null} height={420} />
      </div>
    </div>
  );
}
