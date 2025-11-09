"use client";
import { useEffect, useRef } from "react";

/**
 * GalaxyBG (ringan)
 * - Pusaran kecil di tengah (atur via radiusScale)
 * - Partikel lebih banyak (baseCount) + warna bervariasi (palette)
 * - “Pecah” saat mouse mendekat, lalu balik ke orbit
 * - O(n) tanpa pairwise lines → ringan
 */
export default function GalaxyBG({
  bg = "#0b0f17",
  // warna bintang (bisa kamu ubah sesuka hati)
  palette = ["#ffffff", "#9bd5ff", "#bfa7ff", "#ffb3df", "#b9fff3"],
  baseCount = 260,     // lebih banyak partikel
  arms = 4,            // lengan spiral
  radiusScale = 0.36,  // bikin pusaran LEBIH KECIL (0.30–0.45 enak)
}) {
  const ref = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d", { alpha: false });

    // ====== sizing ======
    let width = 0, height = 0, dpr = 1;
    const clampDpr = () => Math.min(window.devicePixelRatio || 1, 1.25); // hemat
    const resize = () => {
      dpr = clampDpr();
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ====== particles ======
    const RMAX = Math.min(width, height) * radiusScale; // kecilkan pusaran
    const RMIN = Math.min(28, RMAX * 0.18);
    const ELLIPSE = 0.08;
    const BASE_OMEGA = 0.0022;

    // jumlah partikel diskalakan kira-kira oleh luas pusaran
    const swirlArea = Math.PI * RMAX * RMAX;
    const refArea = 900 * 900; // referensi
    const densityScale = Math.min(1.4, Math.max(0.6, swirlArea / refArea));
    const COUNT = Math.max(140, Math.floor(baseCount * densityScale));

    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];

    const particles = new Array(COUNT).fill(0).map(() => {
      const t = Math.random();
      const r = RMIN + Math.pow(t, 0.55) * (RMAX - RMIN); // padat di tengah
      const th = Math.random() * Math.PI * 2;
      const w = BASE_OMEGA * (1.9 - r / (RMAX + 1));
      const color = pick(palette);
      return {
        r,
        th,
        w: w * rand(0.9, 1.12),
        jitter: rand(-1.5, 1.5),
        vx: 0,
        vy: 0,
        x: 0,
        y: 0,
        size: Math.max(0.6, (1.6 - r / (RMAX + 1)) * rand(0.7, 1.3)),
        armShift: rand(0, Math.PI * 2),
        color,
        twPhase: Math.random() * Math.PI * 2,       // buat twinkle
        twSpeed: rand(0.0012, 0.0032),
        baseAlpha: rand(0.55, 0.9),
      };
    });

    // ====== mouse repel ======
    let mx = -9999, my = -9999, pointerActive = false;
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
      pointerActive = true;
    };
    const onLeave = () => {
      pointerActive = false;
      mx = my = -9999;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    // ====== anim ======
    const BG_FADE = 0.21;
    const MOUSE_R = 105;
    const REPEL = 0.55;
    const DAMP = 0.967;
    const JITTER = 0.12;
    let t = 0;

    const draw = () => {
      ctx.fillStyle = bg;
      if (BG_FADE > 0) {
        ctx.globalAlpha = BG_FADE;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      } else ctx.fillRect(0, 0, width, height);

      // pusat galaxy dengan jitter kecil biar “hidup”
      const cx = width * 0.5 + Math.sin(t * 0.0015) * 6;
      const cy = height * 0.5 + Math.cos(t * 0.0012) * 5;

      // additive mode bikin glow lembut tanpa berat berlebihan
      const prevComp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const armWave = Math.sin(p.th * arms + p.armShift) * (p.r * 0.014);
        const rNow = p.r + p.jitter + armWave;

        p.th += p.w + (Math.random() - 0.5) * 0.00018 * JITTER;

        let ox = cx + Math.cos(p.th) * rNow;
        let oy = cy + Math.sin(p.th) * rNow * (1 - ELLIPSE);

        if (pointerActive) {
          const dx = ox - mx, dy = oy - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_R * MOUSE_R) {
            const d = Math.max(10, Math.sqrt(d2));
            const f = (1 - d / MOUSE_R) * REPEL;
            p.vx += (dx / d) * f * 5.8;
            p.vy += (dy / d) * f * 5.8;
          }
        }

        p.vx *= DAMP; p.vy *= DAMP;
        p.x = ox + p.vx; p.y = oy + p.vy;

        // twinkle
        const tw = p.baseAlpha * (0.65 + 0.35 * Math.sin(p.twPhase + t * p.twSpeed));
        ctx.globalAlpha = Math.max(0.25, Math.min(1, tw));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = prevComp;

      t += 16.66;
      rafRef.current = requestAnimationFrame(draw);
    };

    if (!prefersReduced) rafRef.current = requestAnimationFrame(draw);
    else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [bg, palette, baseCount, arms, radiusScale]);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <canvas ref={ref} className="w-full h-full block" />
    </div>
  );
}
