"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, KeyRound, Search, Trash2 } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

const PER_PAGE = 10;

function readRoleFromCookie() {
  if (typeof document === "undefined") return "user";
  const m = document.cookie.match(/(?:^|;\s*)ioh_role=([^;]+)/);
  return decodeURIComponent(m?.[1] || "user");
}

function Panel({ children, className = "" }) {
  return (
    <div className={"rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-4 md:p-6 " + className}>
      {children}
    </div>
  );
}

function ConfirmModal({ open, onClose, title, description, confirmText = "Ya, lanjut", onConfirm, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#171829]/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-white/80 mb-4">{description}</p>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={onClose} disabled={loading}>Batal</button>
          <button
            className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Memproses…</span> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPwdModal({ open, onClose, user, onSubmit, loading }) {
  const [show, setShow] = useState(false);
  const [pwd, setPwd] = useState("");

  useEffect(() => { if (open) setPwd(""); }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#171829]/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-2">Reset Password</h3>
        <p className="text-white/80 mb-4">
          Atur password baru untuk <span className="font-semibold text-white">{user?.username}</span>
        </p>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Password baru (min 6 karakter)"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-3 top-2.5 text-white/70 hover:text-white"
            onClick={() => setShow((v) => !v)}
            aria-label="toggle password"
          >
            {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={onClose} disabled={loading}>Batal</button>
          <button
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            disabled={loading || pwd.length < 6}
            onClick={() => onSubmit(pwd)}
          >
            {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Menyimpan…</span> : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState("user"); 

  useEffect(() => { setRole(readRoleFromCookie()); }, []);

  const [q, setQ] = useState("");
  const [debQ, setDebQ] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delUser, setDelUser] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

useEffect(() => {
    const t = setTimeout(() => { setDebQ(q.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("perPage", String(PER_PAGE));
    if (debQ) sp.set("q", debQ);
    return sp.toString();
  }, [page, debQ]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setErr("");
    fetch(`/api/admin/users?${query}`, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total || 0));
      })
      .catch(e => { if (e.name !== "AbortError") { console.error(e); setErr("Gagal memuat data"); } })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const visible = 5;
  let start = Math.max(1, page - Math.floor(visible / 2));
  let end = Math.min(pageCount, start + visible - 1);
  if (end - start + 1 < visible) start = Math.max(1, end - visible + 1);
  const pages = []; for (let i = start; i <= end; i++) pages.push(i);

  const onReset = async (pwd) => {
    try {
      setResetLoading(true);
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetUser.id, newPassword: pwd }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Gagal reset password");
      setResetOpen(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setResetLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setDelLoading(true);
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: delUser.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Gagal menghapus user");
      setDelOpen(false);
      // refresh list
      setItems((s) => s.filter((u) => u.id !== delUser.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      alert(e.message);
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-[#0e1021] via-[#0b0d1a] to-[#0f1222]">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-20 -top-24 w-[34vw] h-[34vw] rounded-full blur-3xl opacity-25 bg-[#a78bfa]" />
        <div className="absolute -right-20 top-44 w-[28vw] h-[28vw] rounded-full blur-3xl opacity-20 bg-[#22d3ee]" />
        <div className="absolute right-1/4 -bottom-24 w-[32vw] h-[28vw] rounded-full blur-3xl opacity-15 bg-[#f59e0b]" />
      </div>

      <div className="relative z-10 flex">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} role={role} />

        <div className="flex-1 flex flex-col min-h-screen">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 p-4 md:p-6">
            <Panel>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-xl font-semibold text-white">Users</h1>
                  <p className="text-white/60 text-sm">Kelola akun user: reset password & hapus akun</p>
                </div>
                <div className="relative">
                  <input
                    placeholder="Cari username / email…"
                    className="pl-9 pr-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-[230px]"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <Search className="w-4 h-4 text-white/60 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-full text-sm text-white">
                  <thead>
                    <tr className="bg-white/10">
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Username</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Role</th>
                      <th className="p-2 text-left">Created</th>
                      <th className="p-2 text-left">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="p-8 text-center text-white/70">Loading…</td></tr>
                    ) : err ? (
                      <tr><td colSpan={6} className="p-8 text-center text-rose-300">{err}</td></tr>
                    ) : items.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-white/70">Tidak ada data</td></tr>
                    ) : (
                      items.map(u => (
                        <tr key={u.id} className="hover:bg-white/5">
                          <td className="p-2">{u.id}</td>
                          <td className="p-2 font-medium">{u.username}</td>
                          <td className="p-2">{u.email}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                              u.role === "admin" ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-2">{u.created_at ? new Date(u.created_at).toLocaleString("id-ID") : "-"}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <button
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                                onClick={() => { setResetUser(u); setResetOpen(true); }}
                                title="Reset password"
                              >
                                <KeyRound className="w-4 h-4" />
                                <span>Reset</span>
                              </button>
                              <button
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600"
                                onClick={() => { setDelUser(u); setDelOpen(true); }}
                                title="Hapus user"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
                <div className="text-xs text-white/60">Menampilkan {items.length} dari {total} user</div>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setPage(p => Math.max(1, p-1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
                  >Prev</button>

                  {start > 1 && <span className="px-2 text-white/60">…</span>}
                  {pages.map(n => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        page === n ? "bg-gray-600 text-white" : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >{n}</button>
                  ))}
                  {end < pageCount && <span className="px-2 text-white/60">…</span>}

                  <button
                    onClick={() => setPage(p => Math.min(pageCount, p+1))}
                    disabled={page === pageCount}
                    className="px-3 py-1 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
                  >Next</button>
                </div>
              </div>
            </Panel>
          </main>
        </div>
      </div>

      <ResetPwdModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        user={resetUser}
        onSubmit={onReset}
        loading={resetLoading}
      />
      <ConfirmModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title="Hapus Akun?"
        description={`Akun "${delUser?.username}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, hapus akun"
        onConfirm={onDelete}
        loading={delLoading}
      />
    </div>
  );
}
