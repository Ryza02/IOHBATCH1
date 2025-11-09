"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

function Panel({ children, className = "" }) {
  return (
    <div
      className={
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] h-full flex flex-col " +
        className
      }
    >
      <div className="p-4 md:p-6 h-full flex-1 flex flex-col">{children}</div>
    </div>
  );
}

export default function AboutPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = "user"; // role hanya dipakai di user

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-[#0e1021] via-[#0b0d1a] to-[#0f1222]">
      {/* Accent blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-20 -top-24 w-[34vw] h-[34vw] rounded-full blur-3xl opacity-25 bg-[#a78bfa]" />
        <div className="absolute -right-20 top-44 w-[28vw] h-[28vw] rounded-full blur-3xl opacity-20 bg-[#22d3ee]" />
        <div className="absolute right-1/4 -bottom-24 w-[32vw] h-[28vw] rounded-full blur-3xl opacity-15 bg-[#f59e0b]" />
      </div>

      <div className="relative z-10 flex">
        <Sidebar role={role} open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="flex-1 flex flex-col min-h-screen">
          <Header role={role} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <Panel className="order-1">
                <div className="h-full flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ scale: 1.02 }}
                    className="relative w-full aspect-[4/3] rounded-xl overflow-hidden ring-1 ring-white/10"
                  >
                    <img
                      src="/images/ioh.jpeg"
                      alt="Indosat Ooredoo Hutchison"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
                    <div className="absolute bottom-3 left-3 text-xs text-white/80 backdrop-blur-sm bg-black/25 px-2 py-1 rounded-md">
                      Indosat Ooredoo Hutchison
                    </div>
                  </motion.div>
                </div>
              </Panel>

              <Panel className="order-2">
                <div className="mb-4">
                  <h1 className="text-white text-2xl md:text-3xl font-bold tracking-wide">
                    About{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200">
                      IOH
                    </span>
                  </h1>
                  <p className="text-sm text-white/60 mt-1">Sejarah singkat perusahaan</p>
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-white/85 leading-relaxed">
                    <strong>Indosat Ooredoo Hutchison (IOH)</strong> dibentuk dari merger dua perusahaan besar,
                    Indosat Ooredoo dan Hutchison Tri, pada tahun 2022. Perusahaan ini berakar pada PT Indosat
                    yang didirikan tahun 1967 sebagai perusahaan telekomunikasi asing pertama di Indonesia,
                    kemudian menjadi BUMN pada 1980 dan perusahaan publik pada 1994. Setelah menjadi perusahaan
                    publik, Indosat mengakuisisi kepemilikan STT dan masuk pasar seluler dengan IM3 pada 2001.
                    Pada 2008, Ooredoo menjadi pemegang saham utama Indosat, dan pada tahun 2022, Indosat Ooredoo
                    bergabung dengan Hutchison Tri (3 Indonesia) untuk membentuk IOH.
                  </p>
                </div>

                <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="text-[11px] uppercase tracking-widest text-white/60">Didirikan</div>
                    <div className="text-white font-semibold">1967</div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="text-[11px] uppercase tracking-widest text-white/60">Merger</div>
                    <div className="text-white font-semibold">2022</div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="text-[11px] uppercase tracking-widest text-white/60">Fokus</div>
                    <div className="text-white font-semibold">Telekomunikasi & Digital</div>
                  </div>
                </div>
              </Panel>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
