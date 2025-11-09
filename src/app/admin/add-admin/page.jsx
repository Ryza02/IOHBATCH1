"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield } from "lucide-react";

function Panel({ children, className = "" }) {
  return (
    <div className={
      "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl " +
      "shadow-[0_10px_30px_rgba(0,0,0,0.35)] " + className
    }>
      {children}
    </div>
  );
}
function Label({ children }) {
  return <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/50">{children}</label>;
}
function TextInput(props) {
  return (
    <input
      {...props}
      className={
        "w-full h-11 px-4 rounded-xl bg-white/10 border border-white/10 " +
        "text-white placeholder:text-white/40 focus:outline-none " +
        "focus:ring-2 focus:ring-purple-500/70 " + (props.className || "")
      }
    />
  );
}
function ConfirmModal({ open, onCancel, onConfirm, summary, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#171829]/95 backdrop-blur-xl p-6"
      >
        <h3 className="text-white font-semibold text-lg mb-2">Buat Admin baru?</h3>
        <p className="text-white/80 text-sm mb-4">
          Akun <span className="font-semibold text-white">{summary}</span> akan memiliki hak admin penuh.
          Pastikan email/username benar.
        </p>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={onCancel} disabled={loading}>
            Batal
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Menyimpan…</span> : "Ya, Buat Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddAdminPage() {
  const pathname = usePathname();
  const isAdminPath = useMemo(() => pathname?.startsWith("/admin"), [pathname]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // {type:'ok'|'err', text:''}

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const validate = () => {
    const e = {};
    const u = form.username.trim();
    const em = form.email.trim();
    if (!u) e.username = "Username wajib.";
    else if (u.length < 3) e.username = "Minimal 3 karakter.";

    if (!em) e.email = "Email wajib.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.email = "Format email tidak valid.";

    if (!form.password) e.password = "Password wajib.";
    else if (form.password.length < 6) e.password = "Minimal 6 karakter.";

    if (!form.confirm) e.confirm = "Konfirmasi password wajib.";
    else if (form.confirm !== form.password) e.confirm = "Konfirmasi tidak sama.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onAskConfirm = (e) => {
    e?.preventDefault?.();
    setToast(null);
    if (!validate()) return;      
    if (!isAdminPath) {            
      setToast({ type: "err", text: "Akses admin diperlukan." });
      return;
    }
    setConfirmOpen(true);
  };

  const doCreate = async () => {
    setLoading(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);

      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });
      clearTimeout(t);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        const msg =
          data?.message ||
          (data?.code === "DUP_USERNAME" ? "Username sudah dipakai." :
           data?.code === "DUP_EMAIL" ? "Email sudah terdaftar." :
           data?.code === "NOT_ADMIN" ? "Anda tidak berhak membuat admin." :
           `Gagal membuat admin (HTTP ${res.status}).`);
        throw new Error(msg);
      }

      setToast({ type: "ok", text: "Admin berhasil dibuat." });
      setForm({ username: "", email: "", password: "", confirm: "" });
      setErrors({});
    } catch (err) {
      setToast({ type: "err", text: err.message || "Gagal menambah admin." });
    } finally {
      setConfirmOpen(false);
      setLoading(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-[#0e1021] via-[#0b0d1a] to-[#0f1222]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-20 -top-24 w-[34vw] h-[34vw] rounded-full blur-3xl opacity-25 bg-[#a78bfa]" />
        <div className="absolute -right-20 top-44 w-[28vw] h-[28vw] rounded-full blur-3xl opacity-20 bg-[#22d3ee]" />
        <div className="absolute right-1/4 -bottom-24 w-[32vw] h-[28vw] rounded-full blur-3xl opacity-15 bg-[#f59e0b]" />
      </div>

      <div className="relative z-10 flex">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 p-4 md:p-6">
            <Panel className="p-4 md:p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg md:text-xl font-semibold text-white">Tambah Admin</h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/20 text-rose-300">
                      <Shield className="w-3.5 h-3.5" /> Admin only
                    </span>
                  </div>
                </div>
                <button
                  onClick={onAskConfirm}
                  className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan…</> : "Buat Admin"}
                </button>
              </div>

              {/* form */}
              <form onSubmit={onAskConfirm} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Username</Label>
                    <TextInput
                      name="username"
                      placeholder="username"
                      maxLength={50}
                      value={form.username}
                      onChange={onChange}
                    />
                    {errors.username && <p className="text-xs text-rose-300 mt-1">{errors.username}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <TextInput
                      type="email"
                      name="email"
                      placeholder="nama@perusahaan.com"
                      value={form.email}
                      onChange={onChange}
                    />
                    {errors.email && <p className="text-xs text-rose-300 mt-1">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <div className="relative">
                      <TextInput
                        type={showPwd ? "text" : "password"}
                        name="password"
                        placeholder="minimal 6 karakter"
                        value={form.password}
                        onChange={onChange}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                        onClick={() => setShowPwd((v) => !v)}
                        aria-label="toggle password"
                      >
                        {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-rose-300 mt-1">{errors.password}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Konfirmasi Password</Label>
                    <TextInput
                      type="password"
                      name="confirm"
                      placeholder="ketik ulang password"
                      value={form.confirm}
                      onChange={onChange}
                    />
                    {errors.confirm && <p className="text-xs text-rose-300 mt-1">{errors.confirm}</p>}
                  </div>
                </div>

                <div className="md:hidden">
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-60"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan…</> : "Buat Admin"}
                  </button>
                </div>
              </form>

              {/* toast mini */}
              {toast && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    toast.type === "ok"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{toast.text}</span>
                </div>
              )}
            </Panel>
          </main>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doCreate}
        summary={`${form.username} • ${form.email || "tanpa email"}`}
        loading={loading}
      />
    </div>
  );
}
