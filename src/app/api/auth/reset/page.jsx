"use client";
import { useState } from "react";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (pwd !== confirm) { setMsg("Konfirmasi password tidak cocok."); return; }
    try {
      setLoading(true);
      const res = await fetch("/api/auth/reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim(), newPassword: pwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal verifikasi OTP");
      setMsg("Berhasil! Silakan login dengan password baru.");
    } catch (err) { setMsg(err.message); }
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 bg-zinc-900/70 p-5 rounded-2xl border border-white/10">
        <h2 className="text-xl font-semibold text-white">Verifikasi OTP</h2>
        <input className="w-full px-4 py-2 rounded-2xl bg-white/20 text-white" placeholder="Email terdaftar"
               type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        <input className="w-full px-4 py-2 rounded-2xl bg-white/20 text-white" placeholder="OTP (6 digit)"
               type="text" maxLength={6} value={otp} onChange={(e)=>setOtp(e.target.value)} required />
        <input className="w-full px-4 py-2 rounded-2xl bg-white/20 text-white" placeholder="Password baru"
               type="password" value={pwd} onChange={(e)=>setPwd(e.target.value)} required />
        <input className="w-full px-4 py-2 rounded-2xl bg-white/20 text-white" placeholder="Konfirmasi password baru"
               type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
        <button disabled={loading} className="w-full py-2 rounded-2xl font-semibold bg-white text-black disabled:opacity-70">
          {loading ? "Memproses..." : "Simpan Password Baru"}
        </button>
        {msg && <p className="text-sm text-emerald-300">{msg}</p>}
        <a href="/login" className="text-white/80 underline text-sm block text-center">Kembali ke Login</a>
      </form>
    </main>
  );
}
