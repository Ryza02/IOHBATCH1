"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { TrendingUp, HardDriveDownload, Gauge, Globe2, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StatsCards() {
  const [stats, setStats] = useState({
    todayTotal: 0,
    todayTotalLabel: "Hari Ini",
    totalGb: 0,
    avgGs: 0,
    totalSite: 0,
  });

  const [modal, setModal] = useState(null); 
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  const cards = useMemo(() => ([
    {
      title: `Total ${stats.todayTotalLabel}`,
      value: (stats.todayTotal ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      fullValue: String(stats.todayTotal ?? 0),
      desc: "Jumlah trafik (GB) pada hari ini atau tanggal terakhir yang tersedia.",
      icon: HardDriveDownload,
      color: "from-[#7f5af0] to-[#4ea8de]",
    },
    {
      title: "Total GB",
      value: Number(stats.totalGb ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      fullValue: String(stats.totalGb ?? 0),
      desc: "Total trafik (GB) seluruh waktu.",
      icon: TrendingUp,
      color: "from-[#1ee9b6] to-[#4ea8de]",
    },
    {
      title: "Rata-rata GB per Hari",
      value: Number(stats.avgGs ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      fullValue: String(stats.avgGs ?? 0),
      desc: "Rata-rata trafik (GB) per hari.",
      icon: Gauge,
      color: "from-[#4ea8de] to-[#7f5af0]",
    },
    {
      title: "Total Site",
      value: Number(stats.totalSite ?? 0).toLocaleString(),
      fullValue: String(stats.totalSite ?? 0),
      desc: "Jumlah unique Site ID di seluruh data.",
      icon: Globe2,
      color: "from-[#ffb86b] to-[#fa709a]",
    },
  ]), [stats]);

  const closeModal = useCallback(() => setModal(null), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeModal();
    if (modal) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, closeModal]);

  const onCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div>
      <AnimatePresence>
        {modal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
         
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

            <motion.div
              initial={{ y: 20, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6 text-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute right-3 top-3 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 p-2"
                onClick={closeModal}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-sm font-semibold text-white/70">{modal.title}</div>
              <div className="mt-2 text-3xl font-bold break-all">{modal.fullValue}</div>
              <div className="mt-2 text-xs text-white/60">{modal.desc}</div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => onCopy(modal.fullValue)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 px-3 py-2 text-sm"
                >
                  {copied ? <Check className="w-4 h-4" /> : null}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={closeModal}
                  className="inline-flex items-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 px-3 py-2 text-sm"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {cards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35 + index * 0.08, type: "spring" }}
            onClick={() => setModal({
              title: stat.title,
              value: stat.value,
              desc: stat.desc,
              fullValue: stat.fullValue
            })}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] cursor-pointer select-none hover:scale-[1.02] transition-transform"
          >
            <span className={`pointer-events-none absolute -right-10 -bottom-16 h-[120px] w-[120px] rounded-full blur-2xl opacity-40 bg-gradient-to-br ${stat.color}`} />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white/70">{stat.title}</p>
                <p className="truncate text-2xl md:text-3xl font-bold tracking-tight mt-2 text-white">{stat.value}</p>
              </div>
              <div className={`ml-4 grid place-items-center rounded-xl bg-gradient-to-br ${stat.color} w-11 h-11 md:w-12 md:h-12 shadow-lg`}>
                <stat.icon className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-sm" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
