"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

function pageTitleFromPath(path) {
  if (path === "/" || path === "/dashboard") return "Dashboard";
  return path
    .replace(/^\//, "")
    .split("/")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" / ");
}

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx);
    const v = p.slice(idx + 1);
    if (k === name) return decodeURIComponent(v);
  }
  return "";
}

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const pathname = usePathname();
  const page = pageTitleFromPath(pathname);

  const [me, setMe] = useState(() => ({
    username: readCookie("ioh_user") || "User",
    role: readCookie("ioh_role") || "",
    avatar_url: "",
  }));

  useEffect(() => {
    let alive = true;
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.user) {
          setMe((prev) => ({
            username: d.user.username || prev.username,
            role: d.user.role || prev.role,
            avatar_url: d.user.avatar_url || prev.avatar_url,
          }));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const [openNotif, setOpenNotif] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifItems, setNotifItems] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const pollRef = useRef(null);

  const fetchNotif = async () => {
    try {
      setLoadingNotif(true);
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = res.ok ? await res.json() : { items: [], count: 0 };
      setNotifItems(Array.isArray(data.items) ? data.items : []);
      setNotifCount(Number(data.count || 0));
    } catch {

    } finally {
      setLoadingNotif(false);
    }
  };

  useEffect(() => {
    fetchNotif();
    pollRef.current = setInterval(fetchNotif, 10000);
    return () => clearInterval(pollRef.current);
  }, []);

  const markAllReadForUser = async () => {
    if (me.role === "admin") return; 
    try {
      await fetch("/api/notifications/unread", { method: "POST" });
      setNotifCount(0);
      setNotifItems((s) => s.map((it) => ({ ...it, unread: false })));
    } catch {}
  };

  const initials = (me.username || "U").trim().slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 text-white/90 px-2.5 py-2 transition"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span>/ Halaman</span>
            </div>
            <h1 className="font-semibold leading-tight text-white">{page}</h1>
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            onClick={() => {
              const next = !openNotif;
              setOpenNotif(next);
              if (next) fetchNotif();
            }}
            className="relative inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 text-white/90 px-2.5 py-2 transition"
            aria-label="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[18px] text-center">
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
          </button>

          {openNotif && (
            <div className="absolute right-28 top-10 w-[320px] rounded-xl border border-white/10 bg-[#171829]/95 backdrop-blur-xl shadow-2xl p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-white/70">Notifikasi</span>
                {me.role !== "admin" && (
                  <button
                    onClick={markAllReadForUser}
                    className="text-[11px] px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/80"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>

              <div className="max-h-[300px] overflow-auto">
                {loadingNotif && (
                  <div className="px-3 py-2 text-sm text-white/60">Memuat…</div>
                )}
                {!loadingNotif && notifItems.length === 0 && (
                  <div className="px-3 py-2 text-sm text-white/60">
                    Tidak ada notifikasi.
                  </div>
                )}
                {notifItems.map((it) => (
                  <Link
                    key={it.id}
                    href={it.href || "#"}
                    className={`flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${
                      it.unread ? "bg-white/5" : ""
                    }`}
                    onClick={() => setOpenNotif(false)}
                  >
                    <div
                      className={`mt-1 w-2 h-2 rounded-full ${
                        it.unread ? "bg-rose-500" : "bg-white/30"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{it.title}</div>
                      <div className="text-xs text-white/70 truncate">{it.text}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition px-2 py-1.5"
            title="Buka profil"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-white/10 flex items-center justify-center text-[11px] text-white/70">
              {me.avatar_url ? (
                <img src={me.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-semibold">{initials}</span>
              )}
            </div>
            <div className="flex flex-col leading-tight mr-1">
              <span className="text-white text-sm font-medium max-w-[160px] truncate">
                {me.username || "User"}
              </span>
              {!!me.role && (
                <span
                  className={`text-[10px] font-semibold ${
                    me.role === "admin" ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {me.role}
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
