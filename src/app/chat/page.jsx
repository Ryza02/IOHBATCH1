"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

function readRole() {
  if (typeof document === "undefined") return "user";
  const m = document.cookie.match(/(?:^|;\s*)ioh_role=([^;]+)/);
  return decodeURIComponent(m?.[1] || "user");
}

function Panel({ children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-4 md:p-6">
      {children}
    </div>
  );
}

export default function UserChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState("user");
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const listRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => { setRole(readRole()); }, []);

  // load history awal
  useEffect(() => {
    let aborted = false;
    fetch("/api/chat/history?limit=100")
      .then(r => r.json()).then(d => { if (!aborted && d.ok) setItems(d.items || []); })
      .catch(()=>{});
    return () => { aborted = true; };
  }, []);

  // SSE
  useEffect(() => {
    const es = new EventSource("/api/chat/stream");
    esRef.current = es;
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.type === "message" && data.msg) {
          setItems(s => [...s, data.msg].slice(-200)); // batasi di memori
          // scroll ke bawah
          listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
        }
      } catch {}
    };
    es.onerror = () => { /* silent retry */ };
    return () => es.close();
  }, []);

  const send = async () => {
    const txt = input.trim();
    if (!txt) return;
    setInput("");
    await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ content: txt }),
    });
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
            <Panel>
              <h1 className="text-xl font-semibold text-white mb-3">Chat dengan Admin</h1>

              <div ref={listRef} className="h-[56vh] overflow-y-auto rounded-xl border border-white/10 p-3 bg-white/5">
                {items.map(m => (
                  <div key={m.id} className={`mb-2 flex ${m.sender_role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`${m.sender_role === "user" ? "bg-indigo-600" : "bg-white/10"} max-w-[70%] rounded-2xl px-3 py-2 text-white`}>
                      <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                      <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleString("id-ID")}</div>
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
                  placeholder="Tulis pesan…"
                />
                <button onClick={send} className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200">
                  Kirim
                </button>
              </div>
            </Panel>
          </main>
        </div>
      </div>
    </div>
  );
}
