"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Table, UsersRound, Globe, User, LogIn, X, Shield, Settings,
  MessageSquare, UserPlus
} from "lucide-react";
import { useEffect, useMemo } from "react";

export default function Sidebar({ open, setOpen, role }) {
  const pathname = usePathname();

  // 👉 Derive role dari URL dulu, baru fallback ke prop/cookie
  const derivedRole = useMemo(() => {
    if (pathname?.startsWith("/admin")) return "admin";
    if (role) return role;
    // fallback ringan dari cookie (kalau ada)
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(?:^|;\s*)ioh_role=([^;]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
    return "user";
  }, [pathname, role]);

  const navigation = useMemo(() => {
    if (derivedRole === "admin") {
      return [
        { name: "Dashboard", icon: Home, href: "/dashboard?role=admin" },
        { name: "Table", icon: Table, href: "/admin/table" },
        { name: "Users", icon: UsersRound, href: "/admin/users" },
        { name: "Chat User", icon: MessageSquare, href: "/admin/chat" },
        { name: "Tambah Admin", icon: UserPlus, href: "/admin/add-admin" },
      ];
    }
    return [
      { name: "Dashboard", icon: Home, href: "/dashboard?role=user" },
      { name: "Table", icon: Table, href: "/dashboard/table" }, // <— perbaiki leading slash
      { name: "Hubungi Admin", icon: UsersRound, href: "/chat" },
      { name: "About", icon: Globe, href: "/about" },
    ];
  }, [derivedRole]);

  const accountPages = useMemo(() => {
    if (derivedRole === "admin") {
      return [
        { name: "Profile", icon: User, href: "/profile" },
        { name: "Log Out", icon: LogIn, href: "/" },
      ];
    }
    return [
      { name: "Profile", icon: User, href: "/profile" },
      { name: "Log Out", icon: LogIn, href: "/" },
    ];
  }, [derivedRole]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href) => pathname === href.split("?")[0];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${open ? "block lg:hidden opacity-100" : "hidden opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed z-50 lg:sticky left-0 top-0 w-[82vw] max-w-[285px] lg:w-64 h-screen flex flex-col
          bg-white/10 backdrop-blur-2xl border-r border-white/20 transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ minHeight: "100dvh", height: "100vh" }}
      >
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white text-purple-700 font-bold text-lg shadow">V</div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white">IOHDASH</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${derivedRole === "admin" ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                {derivedRole === "admin" ? "Admin" : "User"}
              </span>
            </div>
          </div>
          <button
            className="lg:hidden inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 text-white/90 px-2.5 py-2 transition"
            onClick={() => setOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2 overflow-y-auto pb-10">
          {derivedRole === "admin" && (
            <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-white/5 text-white/80 p-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-xs">You have administrator access</span>
            </div>
          )}

          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition ${
                isActive(item.href) ? "bg-white/20 text-white shadow-lg" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}

          <div className="pt-5">
            <p className="px-4 text-xs font-semibold uppercase tracking-wider text-white/50">Pengaturan Akun</p>
            <div className="mt-2 space-y-1">
              {accountPages.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition ${
                    isActive(item.href) ? "bg-white/20 text-white shadow-lg" : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="py-4 text-center text-xs text-white/50">IOH ©2025</div>
      </aside>
    </>
  );
}
