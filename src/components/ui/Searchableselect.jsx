"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function SearchableSelect({
  options = [],             // [{label, value}]
  value = "",
  onChange,
  placeholder = "Pilih…",
  className = "",
}) {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, direction: "down" });

  // Untuk list sangat besar, tampilkan sebagian dulu sampai user mengetik
  const HARD_CAP = 300;

  const filtered = useMemo(() => {
    if (!q) return options;
    const s = q.toLowerCase();
    return options.filter(
      (o) =>
        (o.label || "").toLowerCase().includes(s) ||
        (o.value || "").toLowerCase().includes(s)
    );
  }, [options, q]);

  const list = useMemo(() => {
    // Saat belum mengetik dan result sangat banyak → batasi agar ringan
    if (!q && filtered.length > HARD_CAP) return filtered.slice(0, HARD_CAP);
    return filtered;
  }, [filtered, q]);

  function updatePosition() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;

    const spaceBelow = vh - (r.bottom + gap);
    const spaceAbove = r.top - gap;
    const direction = spaceBelow >= 280 || spaceBelow >= spaceAbove ? "down" : "up";
    const top = direction === "down" ? r.bottom + gap : r.top - gap;
    const left = Math.min(r.left, vw - r.width - 8);

    setPos({ top, left, width: r.width, direction });
  }

  // Reposition & listeners ketika dropdown open
  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    const onKey = (e) => e.key === "Escape" && setOpen(false);

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close ketika klik di luar trigger (klik pada item di portal akan menutup via onClick item)
  useEffect(() => {
    const onDocClick = (e) => {
      if (!triggerRef.current) return;
      if (open && !triggerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-10 px-3 rounded-lg bg-[#1f2336] text-white/90 border border-white/15 text-sm flex items-center justify-between"
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <span className="opacity-60">▾</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="z-[9999] fixed"
            style={{
              top: pos.direction === "down" ? pos.top : undefined,
              bottom:
                pos.direction === "up"
                  ? window.innerHeight - pos.top
                  : undefined,
              left: pos.left,
              width: pos.width,
            }}
          >
            <div className="rounded-lg border border-white/15 bg-[#0f1323] shadow-2xl overflow-hidden">
              {/* search bar */}
              <div className="p-2 border-b border-white/10 sticky top-0 bg-[#0f1323]">
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari label atau value…"
                  className="w-full h-9 px-3 rounded-md bg-[#1f2336] text-white/90 text-sm outline-none"
                />
                <div className="text-[10px] text-white/50 mt-1">
                  {filtered.length.toLocaleString("id-ID")} hasil
                  {!q && filtered.length > HARD_CAP
                    ? ` • menampilkan ${HARD_CAP}, ketik untuk mempersempit`
                    : ""}
                </div>
              </div>

              {/* list */}
              <div style={{ maxHeight: 320, overflow: "auto" }}>
                {list.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-white/60">
                    Tidak ada hasil
                  </div>
                ) : (
                  list.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onChange?.(opt.value);
                        setOpen(false);
                        setQ("");
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 ${
                        value === opt.value ? "text-white" : "text-white/80"
                      }`}
                      title={opt.label}
                    >
                      {opt.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
