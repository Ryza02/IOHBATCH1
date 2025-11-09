"use client";

import { useState } from "react";

export default function UserChat() {
  const [messages, setMessages] = useState([
    { from: "system", text: "Halo! Ada yang bisa dibantu? 👋" },
  ]);
  const [input, setInput] = useState("");

  const send = (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: "me", text }]);
    setInput("");
    // di sini nanti bisa panggil API / socket untuk kirim ke admin
  };

  return (
    <div className="flex h-[360px] flex-col rounded-xl border border-white/10 bg-white/5">
      <div className="px-4 py-3 border-b border-white/10 text-white/80 text-sm font-semibold">
        User Chat
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
              m.from === "me"
                ? "ml-auto bg-purple-600 text-white"
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
          placeholder="Tulis pesan…"
          className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-purple-600 text-white px-4 py-2 font-medium hover:bg-purple-500"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
