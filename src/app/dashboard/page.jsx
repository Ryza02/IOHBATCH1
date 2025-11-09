"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import StatsCards from "@/components/stats-cards";

// Shared
import { FiltersProvider } from "@/components/filters-context";

// LEVEL SITE – TIDAK lazy (prioritas render grafik)
import Traffic from "@/components/traffic";
import Availability from "@/components/availability";

// LEVEL SECTOR (tetap lazy karena paling berat)
import { SectorFiltersProvider } from "@/components/sector-filters-context";
import dynamic from "next/dynamic";
const SectorLevel = dynamic(() => import("@/components/sector-level"), {
  ssr: false,
  loading: () => <Skel h={420} />,
});

/* ---------- UI helpers ---------- */
function Panel({ children, className = "" }) {
  return (
    <div
      className={
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] h-full flex flex-col " +
        className
      }
    >
      <div className="p-4 h-full flex-1 flex flex-col">{children}</div>
    </div>
  );
}
function Skel({ h = 240, className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-white/5 border border-white/10 animate-pulse ${className}`}
      style={{ height: h }}
    />
  );
}

// ErrorBoundary sederhana (agar tidak mem‐lazy komponen chart)
function ErrorShell({ children }) {
  return <Suspense fallback={<Skel h={520} />}>{children}</Suspense>;
}

/* ---------- Cookie helper ---------- */
function getCookie(name) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

export default function DashboardPage() {
  const sp = useSearchParams();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // role
  const [role, setRole] = useState("user");
  useEffect(() => {
    const qp = (sp.get("role") || "").toLowerCase();
    const ck = (getCookie("ioh_role") || "").toLowerCase();
    const r = qp || ck;
    setRole(r === "admin" ? "admin" : "user");
  }, [sp]);

  // Opsi hemat RAM: tombol “muat” manual untuk LEVEL SECTOR
  const [delaySector] = useState(false);
  const [showSector, setShowSector] = useState(!delaySector);

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-[#0e1021] via-[#0b0d1a] to-[#0f1222]">
      {/* Accent blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-20 -top-24 w-[34vw] h-[34vw] rounded-full blur-3xl opacity-25 bg-[#a78bfa]" />
        <div className="absolute -right-20 top-44 w-[28vw] h-[28vw] rounded-full blur-3xl opacity-20 bg-[#22d3ee]" />
        <div className="absolute right-1/4 -bottom-24 w-[32vw] h-[28vw] rounded-full blur-3xl opacity-15 bg-[#f59e0b]" />
      </div>

      {/* CSS vars */}
      <style jsx global>{`
        :root {
          --rh: 240px;
          --gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          :root {
            --rh: 260px;
          }
        }
      `}</style>

      <div className="relative z-10 flex">
        <Sidebar role={role} open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="flex-1 flex flex-col min-h-screen">
          <Header
            role={role}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

          <FiltersProvider>
            <main className="flex-1 p-4 md:p-6 space-y-6">
              {/* ======= STATS ======= */}
              <Suspense fallback={<Skel h={96} />}>
                <StatsCards />
              </Suspense>

              {/* ======= LEVEL SITE (langsung render, tanpa lazy) ======= */}
              <section>
                <div className="text-xs font-bold text-[#adadbe] mb-2 ml-1">
                  LEVEL SITE
                </div>
                <div
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  style={{ gridAutoRows: "minmax(360px, auto)" }}
                >
                  <Panel>
                    {/* Tidak pakai Suspense agar chart diprioritaskan */}
                    <div className="h-full flex-1">
                      <Traffic />
                    </div>
                  </Panel>
                  <Panel>
                    <div className="h-full flex-1">
                      <Availability />
                    </div>
                  </Panel>
                </div>
              </section>

              {/* ======= LEVEL SECTOR ======= */}
              <section className="mt-2">
                <div className="text-xs font-bold text-[#adadbe] mb-2 ml-1">
                  LEVEL SECTOR
                </div>

                {!showSector ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-6">
                    <p className="text-white/80 mb-3">
                      Komponen level sector cukup berat. Klik untuk memuat.
                    </p>
                    <button
                      onClick={() => setShowSector(true)}
                      className="px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200"
                    >
                      Muat LEVEL SECTOR
                    </button>
                  </div>
                ) : (
                  <SectorFiltersProvider>
                    <Panel className="!h-auto">
                      {/* Dibungkus Suspense ringan agar tidak blok render awal */}
                      <ErrorShell>
                        <SectorLevel />
                      </ErrorShell>
                    </Panel>
                  </SectorFiltersProvider>
                )}
              </section>
            </main>
          </FiltersProvider>
        </div>
      </div>
    </div>
  );
}
