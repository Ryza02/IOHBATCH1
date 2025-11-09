"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";

function Panel({ children, className = "" }) {
  return (
    <div className={"rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] h-full flex flex-col " + className}>
      <div className="p-4 h-full flex-1 flex flex-col">{children}</div>
    </div>
  );
}
function Skel({ h = 240, className = "" }) {
  return <div className={`rounded-2xl bg-white/5 border border-white/10 animate-pulse ${className}`} style={{ height: h }} />;
}

const Sidebar = dynamic(() => import("@/components/admin/Sidebar"), { ssr: false });
const Header = dynamic(() => import("@/components/header"), { ssr: false });
const StatsCards = dynamic(() => import("@/components/stats-cards"), { ssr: false, loading: () => <Skel h={96} /> });
const Traffic = dynamic(() => import("@/components/traffic"), { ssr: false, loading: () => <Skel h={360} /> });
const Availability = dynamic(() => import("@/components/availability"), { ssr: false, loading: () => <Skel h={360} /> });
const SectorMap = dynamic(() => import("@/components/sector-map"), { ssr: false, loading: () => <Skel h={520} /> });
const SectorMetric = dynamic(() => import("@/components/sector-metric"), { ssr: false, loading: () => <Skel /> });

export default function AdminDashboardClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rh, setRh] = useState(240);

  useEffect(() => {
    const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--rh"));
    if (!Number.isNaN(v)) setRh(v);
  }, []);

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-[#0e1021] via-[#0b0d1a] to-[#0f1222]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-20 -top-24 w-[34vw] h-[34vw] rounded-full blur-3xl opacity-25 bg-[#a78bfa]" />
        <div className="absolute -right-20 top-44 w-[28vw] h-[28vw] rounded-full blur-3xl opacity-20 bg-[#22d3ee]" />
        <div className="absolute right-1/4 -bottom-24 w-[32vw] h-[28vw] rounded-full blur-3xl opacity-15 bg-[#f59e0b]" />
      </div>

      <style jsx global>{`
        :root { --rh: 220px; --gap: 1.5rem; }
        @media (min-width: 640px) { :root { --rh: 240px; } }
        @media (min-width: 1024px) { :root { --rh: 260px; } }
      `}</style>

      <div className="relative z-10 flex">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 p-4 md:p-6 space-y-6">
            <Suspense fallback={<Skel h={96} />}>
              <StatsCards />
            </Suspense>

            <section>
              <div className="text-xs font-bold text-[#adadbe] mb-2 ml-1">LEVEL SITE</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ gridAutoRows: "minmax(360px, auto)" }}>
                <Panel><Suspense fallback={<Skel h={360} />}><Traffic /></Suspense></Panel>
                <Panel><Suspense fallback={<Skel h={360} />}><Availability /></Suspense></Panel>
              </div>
            </section>

            <section className="mt-2">
              <div className="text-xs font-bold text-[#adadbe] mb-2 ml-1">LEVEL SECTOR</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" style={{ gridAutoRows: "var(--rh)" }}>
                <div className="order-1 sm:col-span-2 lg:order-none lg:col-span-2 lg:row-span-2">
                  <Panel>
                    <Suspense fallback={<Skel h={520} />}>
                      <div className="w-full flex-1" style={{ height: "calc((var(--rh) * 2) + var(--gap))" }}>
                        <SectorMap />
                      </div>
                    </Suspense>
                  </Panel>
                </div>
                <div className="order-2"><Panel><Suspense fallback={<Skel />}><SectorMetric metric="eut"  title="SECTOR – THROUGHPUT (EUT)" type="number" /></Suspense></Panel></div>
                <div className="order-3"><Panel><Suspense fallback={<Skel />}><SectorMetric metric="cqi"  title="SECTOR – CQI"                   type="number" /></Suspense></Panel></div>
                <div className="order-4"><Panel><Suspense fallback={<Skel />}><SectorMetric metric="user" title="SECTOR – USER"                  type="number" /></Suspense></Panel></div>
                <div className="order-5"><Panel><Suspense fallback={<Skel />}><SectorMetric metric="rank2" title="SECTOR – RANK2 (%)"           type="percent" /></Suspense></Panel></div>
                <div className="order-6"><Panel><Suspense fallback={<Skel />}><SectorMetric metric="prb"  title="SECTOR – PRB (%)"              type="percent" /></Suspense></Panel></div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
