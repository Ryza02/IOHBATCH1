"use client";

import { useState } from "react";

export default function AdminChat() {
  const [messages, setMessages] = useState([
    { from: "system", text: "Admin channel — balas pesan user di sini." },
  ]);
  const [input, setInput] = useState("");

  const send = (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: "admin", text }]);
    setInput("");
    // nanti bisa dihubungkan ke API / socket untuk broadcast ke user tertentu
  };

  return (
    <div className="flex h-[360px] flex-col rounded-xl border border-white/10 bg-white/5">
      <div className="px-4 py-3 border-b border-white/10 text-white/80 text-sm font-semibold">
        Admin Chat
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
              m.from === "admin"
                ? "ml-auto bg-rose-600 text-white"
                : m.from === "system"
                ? "mx-auto bg-white/10 text-white/80"
                : "mr-auto bg-white/10 text-white"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="p-3 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis balasan…"
          className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-rose-600 text-white px-4 py-2 font-medium hover:bg-rose-500"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
