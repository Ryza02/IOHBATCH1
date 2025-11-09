"use client";
import GalaxyBG from "@/components/galaxybg";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex items-center justify-center">
      {/* background spline */}
      <GalaxyBG />

      {/* konten */}
      <main className="relative z-10 text-center px-4 select-none">
        <p
          className="
            text-[18px] md:text-[20px] tracking-[0.3em] mb-3 uppercase
            bg-gradient-to-r from-white/90 via-rose-200/80 to-sky-200/80
            bg-clip-text text-transparent
          "
        >
          Welcome to
        </p>

        <h1
          className="
            font-extrabold leading-none uppercase tracking-[0.08em]
            text-[12vw] md:text-5xl lg:text-6xl
            bg-gradient-to-r from-white via-rose-300 to-sky-300
            bg-clip-text text-transparent
          "
        >
          IOHDASH
        </h1>

        <div className="mt-10">
          <Link
            href="/login"
            className="
              inline-flex items-center justify-center
              rounded-full px-8 py-3 font-semibold
              bg-white text-black hover:bg-zinc-200 transition shadow-lg
            "
          >
            Login / Register
          </Link>
        </div>
      </main>
    </div>
  );
}
