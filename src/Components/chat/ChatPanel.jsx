import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import Button from "../ui/Button";

function nowIso() {
  return new Date().toISOString();
}

export default function ChatPanel({ meId, peerId }) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const bottomRef = useRef(null);

  const pairFilter = useMemo(() => {
    if (!meId || !peerId) return "";
    // sender_id=in.(me,peer)&recipient_id=in.(me,peer) is easier but not supported in filter string for realtime
    return { meId, peerId };
  }, [meId, peerId]);

  async function loadThread() {
    if (!meId || !peerId) return;
    setLoading(true);
    setErr("");

    const res = await supabase
      .from("messages")
      .select("id, created_at, sender_id, recipient_id, body, read_at")
      .or(
        `and(sender_id.eq.${meId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${meId})`
      )
      .order("created_at", { ascending: true })
      .limit(500);

    if (res.error) setErr(res.error.message);
    setMessages(res.data || []);
    setLoading(false);
  }

  async function markRead() {
    if (!meId || !peerId) return;
    await supabase
      .from("messages")
      .update({ read_at: nowIso() })
      .eq("recipient_id", meId)
      .eq("sender_id", peerId)
      .is("read_at", null);
  }

  useEffect(() => {
    loadThread().then(() => markRead());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, peerId]);

  useEffect(() => {
    if (!meId || !peerId) return;

    const ch = supabase.channel(`thread:${meId}:${peerId}`);

    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const m = payload.new;
        const relevant =
          (m.sender_id === meId && m.recipient_id === peerId) ||
          (m.sender_id === peerId && m.recipient_id === meId);
        if (!relevant) return;
        setMessages((prev) => [...prev, m]);
        if (m.sender_id === peerId && m.recipient_id === meId) markRead();
      }
    );

    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pairFilter, meId, peerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    setErr("");
    if (!meId || !peerId) return;
    const body = text.trim();
    if (!body) return;
    setText("");

    const ins = await supabase.from("messages").insert({
      sender_id: meId,
      recipient_id: peerId,
      body,
    });

    if (ins.error) {
      setErr(ins.error.message);
      setText(body);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
      <div className="flex-1 p-4 overflow-auto">
        {loading ? (
          <div className="text-sm text-white/60">Loading conversation…</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-white/60">No messages yet. Say hi.</div>
        ) : (
          <div className="grid gap-2">
            {messages.map((m) => {
              const mine = m.sender_id === meId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm border ${
                      mine
                        ? "bg-violet-500/15 border-violet-400/30 text-white"
                        : "bg-white/5 border-white/10 text-white/90"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div className="mt-1 text-[10px] text-white/50">
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/10 bg-black/10">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write a message…"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <Button onClick={send}>Send</Button>
        </div>
        {err && <div className="mt-2 text-xs text-red-300">{err}</div>}
      </div>
    </div>
  );
}

