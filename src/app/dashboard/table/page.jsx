"use client";

import { useEffect, useState, Suspense } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import UserTable from "@/components/user/UserTable";

function Panel({ children, className = "" }) {
  return (
    <div className={
      "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl " +
      "shadow-[0_10px_30px_rgba(0,0,0,0.35)] h-full flex flex-col " + className
    }>
      <div className="p-4 md:p-6 h-full flex-1 flex flex-col">{children}</div>
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

export default function TablePage() {
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
            <Suspense fallback={<Skel h={420} />}>
              <Panel>
                <h2 className="text-sm font-bold text-[#adadbe] mb-3 ml-1"></h2>
                <UserTable boxed={false} />
              </Panel>
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
