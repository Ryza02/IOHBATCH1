"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Table, UsersRound, Globe, User, LogIn, X } from "lucide-react";
import { useEffect } from "react";

// khusus user
const navigation = [
  { name: "Dashboard", icon: Home, href: "/dashboard" },
  { name: "Table", icon: Table, href: "/table" },
  { name: "Hubungi Admin", icon: UsersRound, href: "/contact-admin" },
  { name: "About", icon: Globe, href: "/about" },
];

const accountPages = [
  { name: "Profile", icon: User, href: "/profile" },
  { name: "Log Out", icon: LogIn, href: "/logout" },
];

export default function Sidebar({ open, setOpen }) {
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${open ? "block lg:hidden opacity-100" : "hidden opacity-0"}`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`fixed z-50 lg:sticky left-0 top-0 w-[82vw] max-w-[285px] lg:w-64 h-screen flex flex-col
          bg-white/10 backdrop-blur-2xl border-r border-white/20
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white text-purple-700 font-bold text-lg shadow">
              U
            </div>
            <span className="font-bold text-lg text-white">User Dashboard</span>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden px-2 py-2 text-white/90">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2 overflow-y-auto pb-10">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition
                  ${active ? "bg-white/20 text-white shadow-lg" : "text-white/80 hover:text-white hover:bg-white/10"}`}
                onClick={() => setOpen(false)}>
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-5">
            <p className="px-4 text-xs font-semibold uppercase tracking-wider text-white/50">Akun</p>
            <div className="mt-2 space-y-1">
              {accountPages.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.name} href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition
                      ${active ? "bg-white/20 text-white shadow-lg" : "text-white/80 hover:text-white hover:bg-white/10"}`}
                    onClick={() => setOpen(false)}>
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="py-4 text-center text-xs text-white/50">IOH User ©2025</div>
      </aside>
    </>
  );
}
