"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const PER_PAGE = 10;

/* ========== Dropdown serbaguna ========== */

// Dropdown searchable (dipakai Sector & Site ID)
function SearchableDropdown({ label, value, onChange, options, placeholder = "Semua" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = [{ label: "Semua", value: "" }, ...options];
    if (!s) return base;
    return base.filter((o) => o.label.toLowerCase().includes(s));
  }, [q, options]);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const p = filtered[active]; if (p) { onChange(p.value); setOpen(false); setQ(""); } }
    else if (e.key === "Escape") setOpen(false);
  };

  const selectedLabel = value ? (options.find((o) => o.value === value)?.label ?? value) : placeholder;

  return (
    <div className="flex flex-col" ref={ref}>
      {label && <label className="text-xs text-white/60 mb-1">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white
                     text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <span className="truncate">{selectedLabel}</span>
          <span className="flex items-center gap-2">
            {value && (
              <span
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                className="text-white/70 hover:text-white cursor-pointer text-sm" title="Clear"
              >×</span>
            )}
            <svg width="16" height="16" viewBox="0 0 20 20" className={`transition ${open ? "rotate-180" : ""}`}>
              <path fill="currentColor" d="M5.5 7.5L10 12l4.5-4.5z" />
            </svg>
          </span>
        </button>

        {open && (
          <div onKeyDown={onKeyDown}
               className="absolute z-50 mt-2 w-full rounded-xl overflow-hidden bg-[#171829]/95 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="p-2 border-b border-white/10">
              <input
                autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} placeholder="Cari…"
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white
                           focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <ul className="max-h-64 overflow-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-2 text-sm text-white/60">Tidak ada data</li>}
              {filtered.map((opt, i) => {
                const isSel = opt.value === value;
                const isAct = i === active;
                return (
                  <li key={`${opt.value}-${i}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => { onChange(opt.value); setOpen(false); setQ(""); }}
                      className={`px-3 py-2 text-sm cursor-pointer select-none
                                  ${isAct ? "bg-white/10" : ""} ${isSel ? "font-semibold text-white" : "text-white/90"}`}>
                    {opt.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Dropdown periode (fixed options, non-search)
function PeriodDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const opts = [
    { label: "All Time", value: "all" },
    { label: "Mingguan", value: "weekly" },
    { label: "Bulanan", value: "monthly" },
    { label: "Tahunan", value: "yearly" },
    { label: "Custom", value: "custom" },
  ];
  const label = opts.find((o) => o.value === value)?.label ?? "All Time";

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="flex flex-col" ref={ref}>
      <label className="text-xs text-white/60 mb-1">Periode</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white
                     flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <span>{label}</span>
          <svg width="16" height="16" viewBox="0 0 20 20" className={`transition ${open ? "rotate-180" : ""}`}>
            <path fill="currentColor" d="M5.5 7.5L10 12l4.5-4.5z" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-2 w-full rounded-xl overflow-hidden bg-[#171829]/95 backdrop-blur-xl border border-white/10 shadow-2xl">
            <ul className="py-1">
              {opts.map((o) => (
                <li key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-white/10
                                ${o.value === value ? "font-semibold text-white" : "text-white/90"}`}>
                  {o.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== Modal Detail ========== */
function DetailModal({ data, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fields = [
    ["Tanggal", data.Date ? new Date(data.Date).toLocaleDateString("id-ID") : ""],
    ["Jam", data.Time],
    ["eNodeB Name", data.eNodeBName],
    ["Cell Name", data.cellName],
    ["Traffic (GB)", data.trafficGB],
    ["User", data.User],
    ["CQI", data.CQI],
    ["Site ID", data.siteId],
    ["Sector", data.Sector],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#171829]/95 backdrop-blur-xl
                   shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-white/70 hover:text-white text-lg"
          onClick={onClose}
          aria-label="Close"
        >×</button>
        <h3 className="text-lg font-semibold text-white mb-4">Detail Data</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm text-white/90">
          {fields.map(([k, v]) => (
            <div key={k} className="flex">
              <span className="min-w-[140px] text-white/60">{k}</span>
              <span className="font-medium">{String(v ?? "")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========== UserTable ========== */

export default function UserTable({ api = "/api/user/data", boxed = true }) {
  // FILTER
  const [sector, setSector] = useState("");
  const [siteId, setSiteId] = useState("");
  const [range, setRange] = useState("all"); // all|weekly|monthly|yearly|custom
  const [dateFrom, setFrom] = useState("");
  const [dateTo, setTo] = useState("");

  // DATA
  const [items, setItems] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [sites, setSites] = useState([]); // {siteId, enodebName}
  const [total, setTotal] = useState(0);

  // UI
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [detail, setDetail] = useState(null);

  // querystring
  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("perPage", String(PER_PAGE));
    if (sector) sp.set("sector", sector);
    if (siteId) sp.set("siteId", siteId);
    sp.set("range", range);
    if (range === "custom") {
      if (dateFrom) sp.set("dateFrom", dateFrom);
      if (dateTo) sp.set("dateTo", dateTo);
    }
    return sp.toString();
  }, [page, sector, siteId, range, dateFrom, dateTo]);

  // fetch
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setErr("");
    fetch(`${api}?${query}`, { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total || 0));
        setSectors(Array.isArray(data.sectors) ? data.sectors : []);
        setSites(Array.isArray(data.sites) ? data.sites : []);
      })
      .catch((e) => { if (e.name !== "AbortError") { console.error(e); setErr("Gagal memuat data"); } })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [api, query]);

  // pagination
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const visible = 5;
  let start = Math.max(1, page - Math.floor(visible / 2));
  let end = Math.min(pageCount, start + visible - 1);
  if (end - start + 1 < visible) start = Math.max(1, end - visible + 1);
  const pages = []; for (let i = start; i <= end; i++) pages.push(i);

  const reset = () => { setSector(""); setSiteId(""); setRange("all"); setFrom(""); setTo(""); setPage(1); };

  const Wrapper = ({ children }) =>
    boxed ? (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-4 md:p-6">
        {children}
      </div>
    ) : (<div>{children}</div>);

  const sectorOptions = useMemo(() => sectors.map((s) => ({ label: s, value: s })), [sectors]);
  const siteOptions = useMemo(
    () => sites.map((s) => ({ label: s.enodebName ? `${s.enodebName} (${s.siteId})` : s.siteId, value: s.siteId })),
    [sites]
  );

  return (
    <Wrapper>
      {/* Toolbar Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <SearchableDropdown
          label="Sector"
          value={sector}
          onChange={(v) => { setSector(v); setPage(1); }}
          options={sectorOptions}
        />
        <SearchableDropdown
          label="Site ID"
          value={siteId}
          onChange={(v) => { setSiteId(v); setPage(1); }}
          options={siteOptions}
        />
        <PeriodDropdown value={range} onChange={(v) => { setRange(v); setPage(1); }} />

        {range === "custom" && (
          <>
            <div className="flex flex-col">
              <label className="text-xs text-white/60 mb-1">Dari</label>
              <input
                type="date" value={dateFrom} onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white
                           focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-white/60 mb-1">Sampai</label>
              <input
                type="date" value={dateTo} onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white
                           focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm text-white">
          <thead>
            <tr className="bg-white/10">
              <th className="p-2 text-left">Tanggal</th>
              <th className="p-2 text-left">Jam</th>
              <th className="p-2 text-left">eNodeB Name</th>
              <th className="p-2 text-left">Cell Name</th>
              <th className="p-2 text-left">Traffic (GB)</th>
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">CQI</th>
              <th className="p-2 text-left">Site ID</th>
              <th className="p-2 text-left">Sector</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-8 text-center text-white/70">Loading…</td></tr>
            ) : err ? (
              <tr><td colSpan={9} className="p-8 text-center text-rose-300">{err}</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-white/70">Data kosong</td></tr>
            ) : (
              items.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => setDetail(row)}
                  className="hover:bg-white/5 cursor-pointer"
                >
                  <td className="p-2">{row.Date ? new Date(row.Date).toLocaleDateString("id-ID") : ""}</td>
                  <td className="p-2">{row.Time}</td>
                  <td className="p-2">{row.eNodeBName}</td>
                  <td className="p-2">{row.cellName}</td>
                  <td className="p-2">{row.trafficGB}</td>
                  <td className="p-2">{row.User}</td>
                  <td className="p-2">{row.CQI}</td>
                  <td className="p-2">{row.siteId}</td>
                  <td className="p-2">{row.Sector}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer & Pagination */}
      <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
        <div className="text-xs text-white/60">
          Menampilkan {items.length} dari total {total} data
        </div>
        <div className="flex gap-1 items-center">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
          >Prev</button>

          {start > 1 && <span className="px-2 text-white/60">…</span>}
          {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                page === n ? "bg-purple-600 text-white" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >{n}</button>
          ))}
          {end < pageCount && <span className="px-2 text-white/60">…</span>}

          <button
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
          >Next</button>
        </div>
      </div>

      {/* Modal detail */}
      {detail && <DetailModal data={detail} onClose={() => setDetail(null)} />}
    </Wrapper>
  );
}
