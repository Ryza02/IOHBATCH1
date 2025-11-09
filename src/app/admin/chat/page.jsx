"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Trash2, Eraser, Loader2 } from "lucide-react";

function readRole() {
  if (typeof document === "undefined") return "admin";
  const m = document.cookie.match(/(?:^|;\s*)ioh_role=([^;]+)/);
  return decodeURIComponent(m?.[1] || "admin");
}
function Panel({ children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-4 md:p-6">
      {children}
    </div>
  );
}

export default function AdminChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState("admin");

  const [threads, setThreads] = useState([]);
  const [activeUser, setActiveUser] = useState(null);

  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [clearing, setClearing] = useState(false);

  const listRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => { setRole(readRole()); }, []);

  const scrollBottom = () => { try { listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); } catch {} };

  const addServerMessage = (m) => {
    if (!m || m.id == null) return;
    setItems(prev => {
      if (prev.some(x => String(x.id) === String(m.id))) return prev;
      const next = prev.filter(x => !(x.client_id && x.sender_role === m.sender_role && x.content === m.content));
      return [...next, m];
    });
    setTimeout(scrollBottom, 0);
  };

  const fetchThreads = () => {
    fetch("/api/chat/threads")
      .then(r => r.json())
      .then(d => { if (d.ok) setThreads(d.items || []); })
      .catch(()=>{});
  };
  useEffect(() => { fetchThreads(); const i = setInterval(fetchThreads, 10000); return () => clearInterval(i); }, []);

  useEffect(() => {
    if (!activeUser) return;
    let aborted = false;
    try { esRef.current?.close(); } catch {}

    fetch(`/api/chat/history?userId=${activeUser.userId}&limit=200`)
      .then(r=>r.json())
      .then(d => {
        if (!aborted && d.ok) {
          setItems(Array.isArray(d.items) ? d.items : []);
          setTimeout(scrollBottom, 0);
        }
      }).catch(()=>{});

    fetch(`/api/chat/seen`, {
      method:"POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ userId: activeUser.userId })
    }).catch(()=>{});

    const es = new EventSource(`/api/chat/stream?userId=${activeUser.userId}`);
    esRef.current = es;
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.type === "message" && data.msg) addServerMessage(data.msg);
        else if (data?.type === "delete" && data.id != null) {
          setItems(prev => prev.filter(m => String(m.id) !== String(data.id)));
        } else if (data?.type === "clear") {
          setItems([]);
        }
      } catch {}
    };
    es.onerror = () => {};

    return () => { aborted = true; try { es.close(); } catch {} };
  }, [activeUser?.userId]);

  const send = async () => {
    const txt = input.trim();
    if (!txt || !activeUser) return;
    setInput("");

    const client_id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = {
      id: `temp-${client_id}`,
      client_id,
      room_id: activeUser.userId,
      sender_id: 0,
      sender_role: "admin",
      content: txt,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setItems(prev => [...prev, optimistic]);
    setTimeout(scrollBottom, 0);

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ content: txt, toUserId: activeUser.userId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data.msg) throw new Error(data?.message || "Gagal kirim");
      setItems(prev => {
        const withoutTemp = prev.filter(m => m.client_id !== client_id);
        if (withoutTemp.some(m => String(m.id) === String(data.msg.id))) return withoutTemp;
        return [...withoutTemp, data.msg];
      });
      setTimeout(scrollBottom, 0);
    } catch {
      setItems(prev => prev.map(m => (m.client_id === client_id ? { ...m, pending: false, error: true } : m)));
    }
  };

  const deleteMsg = async (id) => {
    if (!id) return;
    setItems(prev => prev.filter(m => String(m.id) !== String(id)));
    try {
      const res = await fetch("/api/chat/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {

    }
  };

  const clearRoom = async () => {
    if (!activeUser) return;
    if (!confirm(`Bersihkan percakapan dengan ${activeUser.username || `User#${activeUser.userId}`}?`)) return;
    setClearing(true);
    try {
      const res = await fetch("/api/chat/clear", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ userId: activeUser.userId }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error();
      setItems([]); 
    } catch {
      
    } finally {
      setClearing(false);
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
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} role={role} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* threads */}
              <Panel>
                <h2 className="text-white font-semibold mb-3">User Aktif</h2>
                <div className="space-y-2 max-h-[64vh] overflow-y-auto">
                  {threads.length === 0 && <div className="text-sm text-white/70">Belum ada percakapan.</div>}
                  {threads.map(t => (
                    <button
                      key={t.userId}
                      onClick={() => setActiveUser(t)}
                      className={`w-full text-left px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition ${
                        activeUser?.userId === t.userId ? "bg-white/10" : "bg-transparent"
                      }`}
                    >
                      <div className="text-white font-medium">{t.username || `User#${t.userId}`}</div>
                      <div className="text-xs text-white/60">{t.email || "-"}</div>
                      <div className="text-[11px] text-white/60 mt-1">
                        Terakhir: {t.last_time ? new Date(t.last_time).toLocaleString("id-ID") : "-"}
                        {Number(t.unread) > 0 && (
                          <span className="ml-2 inline-block px-2 py-0.5 rounded bg-rose-600 text-white text-[10px]">+{t.unread}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>

              <div className="md:col-span-2">
                <Panel>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-white font-semibold">
                      {activeUser ? (activeUser.username || `User#${activeUser.userId}`) : "Pilih user"}
                    </h2>

                    <button
                      onClick={clearRoom}
                      disabled={!activeUser || clearing}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-60"
                      title="Bersihkan percakapan"
                    >
                      {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
                      <span>Bersihkan</span>
                    </button>
                  </div>

                  <div ref={listRef} className="h-[58vh] overflow-y-auto rounded-xl border border-white/10 p-3 bg-white/5">
                    {!activeUser && <div className="text-white/70">Pilih user di panel kiri untuk membuka percakapan.</div>}

                    {activeUser && items.map(m => (
                      <div
                        key={`${m.id}`}
                        className={`mb-2 flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div className="group relative">
                          <div className={`${m.sender_role === "admin" ? "bg-indigo-600" : "bg-white/10"} max-w-[70%] rounded-2xl px-3 py-2 text-white`}>
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {m.content}
                              {m.pending && <span className="ml-2 text-[10px] opacity-70">(mengirim…)</span>}
                              {m.error && <span className="ml-2 text-[10px] text-rose-300">(gagal)</span>}
                            </div>
                            <div className="text-[10px] opacity-70 mt-1">
                              {new Date(m.created_at).toLocaleString("id-ID")}
                            </div>
                          </div>

                          {m.id && String(m.id).startsWith("temp-") === false && (
                            <button
                              onClick={() => deleteMsg(m.id)}
                              className={`absolute ${m.sender_role === "admin" ? "-left-10" : "-right-10"} top-1 opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-600/90 text-white text-xs`}
                              title="Hapus pesan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      value={input}
                      onChange={e=>setInput(e.target.value)}
                      onKeyDown={e=>{ if (e.key==="Enter") send(); }}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={activeUser ? "Tulis balasan…" : "Pilih user dahulu"}
                      disabled={!activeUser}
                    />
                    <button
                      onClick={send}
                      disabled={!activeUser}
                      className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-60"
                    >
                      Kirim
                    </button>
                  </div>
                </Panel>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
