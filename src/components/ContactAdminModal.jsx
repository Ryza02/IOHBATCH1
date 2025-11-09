"use client";

import React, { useState, useEffect, useCallback } from "react";

/** Modal chat reset password ke admin (dipakai di halaman login) */
export default function ContactAdminModal({ open, onClose, presetEmail }) {
  const [email, setEmail] = useState(presetEmail || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [thread, setThread] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);

  // Sinkronkan email ketika modal dibuka / prop berubah
  useEffect(() => {
    if (open) setEmail(presetEmail || "");
  }, [presetEmail, open]);

  const fetchThread = useCallback(
    async (targetEmail) => {
      // ✅ perbaikan: jangan campur ?? dan || — pakai fallback berantai saja
      const em = String(targetEmail ?? email ?? "").trim();
      if (!em) {
        setThread([]);
        return;
      }
      try {
        setLoadingThread(true);
        const res = await fetch(
          `/api/support/chat?email=${encodeURIComponent(em)}&limit=100`,
          { cache: "no-store", next: { revalidate: 0 } }
        );
        const data = await res.json();
        if (res.ok && data?.ok) {
          const items = (data.items || []).map((r) => ({
            role: String(r.role || "").toLowerCase(), // user/admin/system
            content: r.content,
            ts: new Date(r.created_at).getTime() || Date.now(),
          }));
          setThread(items);
        } else {
          setMsg(data?.message || "Gagal memuat chat.");
        }
      } catch (e) {
        setMsg(e.message || "Gagal memuat chat.");
      } finally {
        setLoadingThread(false);
      }
    },
    [email]
  );

  // Polling setiap 5 detik saat modal terbuka & email sudah terisi
  useEffect(() => {
    if (!open || !email) return;
    let stop = false;
    const tick = () => !stop && fetchThread(email);
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [open, email, fetchThread]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    const em = String(email ?? "").trim();
    const note = String(message ?? "").trim();

    if (!em) return setMsg("Email terdaftar wajib diisi.");
    if (!note) return setMsg("Pesan tidak boleh kosong.");

    try {
      setSending(true);
      const res = await fetch("/api/support/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, note }),
        cache: "no-store",
        next: { revalidate: 0 },
        credentials: "same-origin",
      });
      const data = await res
        .json()
        .catch(async () => ({ message: await res.text() }));

      if (!res.ok || data?.ok === false) {
        throw new Error(
          data?.message || `Gagal mengirim (HTTP ${res.status})`
        );
      }

      setMessage("");
      setMsg("Permintaan terkirim. Admin akan merespons via chat.");
      // refresh dari server agar sinkron dengan admin
      fetchThread(em);
    } catch (err) {
      setMsg(err.message || "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !sending) {
      submit(e);
    }
    if (e.key === "Escape" && !sending) onClose?.();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onKeyDown={onKeyDown}
    >
      <div className="w-full max-w-md rounded-2xl bg-zinc-900/80 border border-white/10 shadow-xl">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Hubungi Admin</h3>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white px-2 py-1 rounded-lg"
              aria-label="Tutup"
              type="button"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-white/70 mt-2">
            Kirim pesan ke admin untuk permintaan <b>reset password</b>.
            Sertakan <b>email terdaftar</b>.
          </p>

          {/* Chat area */}
          <div className="mt-3 h-44 overflow-y-auto rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
            {loadingThread && (
              <p className="text-white/50 text-sm">Memuat chat…</p>
            )}
            {!loadingThread && thread.length === 0 && (
              <p className="text-white/50 text-sm">
                Belum ada percakapan. Tulis pesan di bawah.
              </p>
            )}
            {thread.map((m, idx) => (
              <div
                key={idx}
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "bg-white text-black ml-auto rounded-br-sm"
                    : m.role === "system"
                    ? "bg-emerald-200/90 text-black rounded-bl-sm"
                    : "bg-indigo-200/90 text-black rounded-bl-sm"
                }`}
                title={new Date(m.ts).toLocaleString()}
              >
                {m.content}
              </div>
            ))}
          </div>

          <form onSubmit={submit} className="mt-3 space-y-3">
            <input
              type="email"
              placeholder="Email terdaftar"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl bg-white/20 text-white/90 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
              required
              autoComplete="email"
              inputMode="email"
            />
            <textarea
              placeholder="Tulis pesan ke admin…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-2xl bg-white/20 text-white/90 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
              required
            />
            <button
              disabled={sending}
              type="submit"
              className="w-full py-2 rounded-2xl font-semibold text-base bg-white text-black hover:bg-zinc-200 transition shadow-lg disabled:opacity-70"
            >
              {sending ? "Mengirim..." : "Kirim ke Admin"}
            </button>

            {msg && (
              <p
                className={`text-sm ${
                  msg.toLowerCase().includes("gagal")
                    ? "text-rose-300"
                    : "text-emerald-300"
                }`}
              >
                {msg}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
