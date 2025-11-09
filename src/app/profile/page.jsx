"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Loader2, CheckCircle2, AlertCircle, Shield, Camera, Trash2, Eye, EyeOff } from "lucide-react";

/* helpers */
function Panel({ children, className = "" }) {
  return (
    <div className={"rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] " + className}>
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
      className={"w-full h-11 px-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/70 " + (props.className || "")}
    />
  );
}

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // data user
  const [user, setUser] = useState(null); // {id, username, email, role, avatar_url}
  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  // info form
  const [uName, setUName] = useState("");
  const [email, setEmail] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // avatar
  const [avatar, setAvatar] = useState(""); // url
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // password form
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // toast
  const [toast, setToast] = useState(null); // {type:'ok'|'err', text:''}
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/profile", { cache: "no-store" });
        if (!r.ok) throw new Error();
        const data = await r.json();
        setUser(data.user);
        setUName(data.user.username || "");
        setEmail(data.user.email || "");
        setAvatar(data.user.avatar_url || "");
      } catch {
        showToast({ type:"err", text:"Gagal memuat profil. Silakan login ulang." });
      }
    })();
  }, []);

  const changedInfo = user && (uName.trim() !== (user.username || "") || email.trim() !== (user.email || ""));

  const saveInfo = async () => {
    if (!changedInfo) return;
    try {
      setSavingInfo(true);
      const r = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ username: uName.trim(), email: email.trim() })
      });
      const js = await r.json().catch(() => ({}));
      if (!r.ok || js.ok === false) {
        const msg = js?.message || (js?.code==="DUP_USERNAME" ? "Username sudah dipakai" : js?.code==="DUP_EMAIL" ? "Email sudah terdaftar" : `HTTP ${r.status}`);
        throw new Error(msg);
      }
      setUser((s)=>({ ...s, username:uName.trim(), email:email.trim() }));
      showToast({ type:"ok", text:"Profil berhasil diperbarui." });
    } catch(e) {
      showToast({ type:"err", text:e.message || "Gagal menyimpan profil." });
    } finally { setSavingInfo(false); }
  };

  const savePassword = async () => {
    if (!curPwd || !newPwd) return showToast({ type:"err", text:"Isi password saat ini & password baru." });
    if (newPwd.length < 6) return showToast({ type:"err", text:"Password baru minimal 6 karakter." });
    if (newPwd !== newPwd2) return showToast({ type:"err", text:"Konfirmasi password baru tidak sama." });
    try {
      setSavingPwd(true);
      const r = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd })
      });
      const js = await r.json().catch(()=> ({}));
      if (!r.ok || js.ok === false) {
        throw new Error(js?.message || (js?.code==="WRONG_PASSWORD" ? "Password saat ini salah" : `HTTP ${r.status}`));
      }
      setCurPwd(""); setNewPwd(""); setNewPwd2("");
      showToast({ type:"ok", text:"Password berhasil diganti." });
    } catch(e) {
      showToast({ type:"err", text:e.message || "Gagal mengganti password." });
    } finally { setSavingPwd(false); }
  };

  const onPickAvatar = () => fileRef.current?.click();
  const onUploadAvatar = async (file) => {
    if (!file) return;
    if (!/image\/(png|jpeg|jpg|webp)/i.test(file.type)) {
      return showToast({ type:"err", text:"Gunakan gambar PNG/JPG/WEBP." });
    }
    if (file.size > 1.5 * 1024 * 1024) {
      return showToast({ type:"err", text:"Maksimal ukuran 1.5MB." });
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      setUploading(true);
      const r = await fetch("/api/profile/avatar", { method:"POST", body: fd });
      const js = await r.json().catch(()=> ({}));
      if (!r.ok || js.ok === false) throw new Error(js?.message || `HTTP ${r.status}`);
      setAvatar(js.url);
      setUser((s)=> ({ ...s, avatar_url: js.url }));
      showToast({ type:"ok", text:"Foto profil diperbarui." });
    } catch(e) {
      showToast({ type:"err", text:e.message || "Gagal mengunggah gambar." });
    } finally { setUploading(false); }
  };

  const initials = (user?.username || "U").slice(0,2).toUpperCase();

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-[#0e1021] via-[#0b0d1a] to-[#0f1222]">
      {/* bg blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-20 -top-24 w-[34vw] h-[34vw] rounded-full blur-3xl opacity-25 bg-[#a78bfa]" />
        <div className="absolute -right-20 top-44 w-[28vw] h-[28vw] rounded-full blur-3xl opacity-20 bg-[#22d3ee]" />
        <div className="absolute right-1/4 -bottom-24 w-[32vw] h-[28vw] rounded-full blur-3xl opacity-15 bg-[#f59e0b]" />
      </div>

      <div className="relative z-10 flex">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 p-4 md:p-6 space-y-6">
            {/* Title */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-semibold text-white">Profil</h1>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/20 text-rose-300">
                      <Shield className="w-3.5 h-3.5" /> Admin
                    </span>
                  )}
                </div>
                <p className="text-white/60 text-sm mt-1">Kelola identitas & keamanan akun Anda.</p>
              </div>
            </div>

            {/* ===== Info Akun (dengan avatar) ===== */}
            <Panel className="p-4 md:p-6">
              <h2 className="text-white font-semibold mb-4">Info Akun</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Avatar */}
                <div className="space-y-3">
                  <Label>Foto Profil</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center text-white/70">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="avatar" src={avatar} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-semibold">{initials}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={onPickAvatar}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-60"
                      >
                        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengunggah…</> : <><Camera className="w-4 h-4" /> Unggah</>}
                      </button>
                      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e)=> onUploadAvatar(e.target.files?.[0])} />
                      {avatar && (
                        <p className="text-[11px] text-white/50">Gambar: PNG/JPG/WEBP, maks 1.5MB</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <TextInput value={uName} onChange={(e)=> setUName(e.target.value)} maxLength={50} />
                </div>

                {/* Email + Role */}
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <TextInput type="email" value={email} onChange={(e)=> setEmail(e.target.value)} />
                  <div className="mt-3">
                    <Label>Role</Label>
                    <div className="h-11 px-4 flex items-center rounded-xl bg-white/5 border border-white/10 text-white/80">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${isAdmin ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                        {user?.role || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <button
                  onClick={saveInfo}
                  disabled={!changedInfo || savingInfo}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-60"
                >
                  {savingInfo ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan…</> : "Simpan Perubahan"}
                </button>
              </div>
            </Panel>

            {/* ===== Keamanan (1 baris current, 2 bawah untuk new + confirm) ===== */}
            <Panel className="p-4 md:p-6">
              <h2 className="text-white font-semibold mb-4">Keamanan</h2>

              {/* baris 1: current password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Password saat ini</Label>
                  <div className="relative">
                    <TextInput
                      type={showCur ? "text" : "password"}
                      value={curPwd}
                      onChange={(e)=> setCurPwd(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                      onClick={()=> setShowCur(v=>!v)}
                      aria-label="toggle current password"
                    >
                      {showCur ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* baris 2: new + confirm */}
                <div className="space-y-1.5">
                  <Label>Password baru</Label>
                  <div className="relative">
                    <TextInput
                      type={showNew ? "text" : "password"}
                      value={newPwd}
                      onChange={(e)=> setNewPwd(e.target.value)}
                      placeholder="minimal 6 karakter"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                      onClick={()=> setShowNew(v=>!v)}
                      aria-label="toggle new password"
                    >
                      {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Konfirmasi password baru</Label>
                  <TextInput
                    type="password"
                    value={newPwd2}
                    onChange={(e)=> setNewPwd2(e.target.value)}
                    placeholder="ketik ulang password baru"
                  />
                  {(newPwd && newPwd2 && newPwd !== newPwd2) && (
                    <p className="text-xs text-rose-300 mt-1">Konfirmasi tidak sama.</p>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <button
                  onClick={savePassword}
                  disabled={savingPwd}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-60"
                >
                  {savingPwd ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengganti…</> : "Ganti Password"}
                </button>
              </div>
            </Panel>

            {/* toast */}
            {toast && (
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                toast.type==="ok" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
                {toast.type==="ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{toast.text}</span>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
