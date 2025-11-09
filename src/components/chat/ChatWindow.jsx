"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getJSON, postJSON, openEventStream } from "@/lib/chat-client";
import { SendHorizontal, Loader2 } from "lucide-react";

function formatClock(s) {
  const d = new Date(s);
  const h = `${d.getHours()}`.padStart(2, "0");
  const m = `${d.getMinutes()}`.padStart(2, "0");
  return `${h}:${m}`;
}

function Bubble({ meRole, m }) {
  const mine = m.sender_role === meRole;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} my-1`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed 
          ${mine ? "bg-indigo-600 text-white" : "bg-white/10 text-white"}
        `}
      >
        <div className="whitespace-pre-wrap break-words">{m.content}</div>
        <div className={`text-[10px] mt-1 opacity-75 ${mine ? "text-white/80" : "text-white/70"}`}>
          {formatClock(m.created_at)}
        </div>
      </div>
    </div>
  );
}

/** props:
 * - mode: 'user' | 'admin'
 * - roomUserId?: number (wajib utk admin; user abaikan)
 * - onBack?: () => void (tombol kembali di mobile)
 * - title?: string (judul header chat)
 */
export default function ChatWindow({ mode, roomUserId, onBack, title }) {
  const meRole = mode === "admin" ? "admin" : "user";
  const [items, setItems] = useState([]);
  const [pending, setPending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const nearBottomRef = useRef(true);
  const roomQuery = mode === "admin" ? `?userId=${roomUserId || 0}` : "";

  // load awal (100 pesan terakhir)
  useEffect(() => {
    if (mode === "admin" && !roomUserId) return;
    let abort = false;
    setError("");
    getJSON(`/api/chat/messages${roomQuery}&limit=100`)
      .then((d) => {
        if (abort) return;
        setItems(Array.isArray(d.items) ? d.items : []);
        // scroll ke bawah setelah mount
        setTimeout(() => {
          const el = listRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        }, 0);
      })
      .catch((e) => setError(e.message || "Gagal memuat pesan"));
    return () => {
      abort = true;
    };
  }, [mode, roomUserId]); // reload saat pindah room

  // SSE stream
  useEffect(() => {
    if (mode === "admin" && !roomUserId) return;
    const s = openEventStream(`/api/chat/stream${roomQuery}`, {
      onEvent: (evt) => {
        if (evt?.type === "message" && evt.msg) {
          setItems((old) => [...old, evt.msg]);
          // auto scroll jika dekat bawah
          const el = listRef.current;
          if (!el) return;
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          if (nearBottom) {
            setTimeout(() => (el.scrollTop = el.scrollHeight), 0);
          }
        }
      },
    });
    return () => s.close();
  }, [mode, roomUserId]);

  // pantau apakah user sedang dekat bagian bawah (untuk auto-scroll)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      nearBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // jika admin membuka room → tandai seen pesan user
  useEffect(() => {
    if (mode !== "admin" || !roomUserId) return;
    // debounce 600ms supaya tidak spam
    const t = setTimeout(() => {
      postJSON("/api/chat/seen", { userId: roomUserId }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [mode, roomUserId, items]);

  const canSend = text.trim().length > 0 && !pending;
  const onSend = async () => {
    if (!canSend) return;
    const payload = { content: text.trim() };
    if (mode === "admin") payload.toUserId = roomUserId;
    setPending(true);
    setError("");
    // Optimistic
    const optimistic = {
      id: -Date.now(),
      room_id: mode === "admin" ? roomUserId : undefined,
      sender_id: 0,
      sender_role: meRole,
      content: payload.content,
      created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      _optimistic: true,
    };
    setItems((old) => [...old, optimistic]);
    setText("");

    try {
      const { msg } = await postJSON("/api/chat/send", payload);
      // ganti pesan optimistik dengan yang resmi
      setItems((old) =>
        old.map((m) => (m._optimistic ? msg : m))
      );
    } catch (e) {
      setItems((old) => old.filter((m) => !m._optimistic));
      setError(e.message || "Gagal mengirim");
    } finally {
      setPending(false);
      // scroll ke bawah
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  };

  // enter = kirim, shift+enter = baris baru
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const headerTitle = useMemo(() => {
    if (title) return title;
    return mode === "admin" ? `User #${roomUserId ?? "-"}` : "Hubungi Admin";
  }, [title, mode, roomUserId]);

  if (mode === "admin" && !roomUserId) {
    return (
      <div className="h-full flex items-center justify-center text-white/60">
        Pilih user untuk memulai percakapan
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* header mini (mobile friendly) */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
        {onBack && (
          <button
            onClick={onBack}
            className="lg:hidden rounded-lg bg-white/10 border border-white/10 px-2 py-1 text-white"
          >
            Kembali
          </button>
        )}
        <div className="font-semibold text-white">{headerTitle}</div>
      </div>

      {/* list pesan */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 md:p-4">
        {items.map((m) => (
          <Bubble key={`${m.id}`} meRole={meRole} m={m} />
        ))}
      </div>

      {/* error bar */}
      {error && (
        <div className="px-3 pb-2 text-rose-300 text-xs">{error}</div>
      )}

      {/* compose */}
      <div className="border-t border-white/10 bg-white/5 px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tulis pesan…"
            rows={1}
            className="flex-1 resize-none rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            onInput={(e) => {
              // auto grow
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = Math.min(160, e.currentTarget.scrollHeight) + "px";
            }}
          />
          <button
            onClick={onSend}
            disabled={!canSend}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-2"
            title="Kirim (Enter)"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
