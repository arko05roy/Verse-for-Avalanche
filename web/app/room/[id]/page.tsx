"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AGENT_PROFILES } from "../../../lib/agent-profiles";

interface ChatMessage {
  id: string;
  phase: "think" | "roast" | "vote" | "system";
  agent: string;
  displayName: string;
  avatar: string;
  message: string;
  voteTarget?: string;
  x402Amount?: string;
  timestamp: number;
}

interface Stats { totalPayments: number; totalSpent: string; }

interface Room {
  id: string; name: string; icon: string; description: string; agents: string[];
}

const AGENT_COLORS: Record<string, string> = {
  CIPHER: "var(--accent-blue)",
  SAGE: "var(--accent-green)",
  SPARK: "var(--accent-orange)",
};

const PILL_CLASS: Record<string, string> = {
  think: "pill-think",
  roast: "pill-roast",
  vote: "pill-vote",
  system: "pill-system",
};

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params);
  const searchParams = useSearchParams();
  const initialRoundId = searchParams.get("roundId");
  const initialPrompt = searchParams.get("prompt");

  const [room, setRoom] = useState<Room | null>(null);
  const [prompt, setPrompt] = useState("");
  const [roundId, setRoundId] = useState<string | null>(initialRoundId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<Stats>({ totalPayments: 0, totalSpent: "0" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [survivors, setSurvivors] = useState<{ agent: string; displayName: string; earned: string }[]>([]);
  const [ejected, setEjected] = useState<{ agent: string; displayName: string } | null>(null);
  const [pickedWinner, setPickedWinner] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load room info
  useEffect(() => {
    fetch("/api/rooms").then((r) => r.json()).then((d) => {
      const found = d.rooms?.find((r: Room) => r.id === roomId);
      setRoom(found || { id: roomId, name: roomId, icon: "⚡", description: "", agents: ["CIPHER", "SAGE", "SPARK"] });
    });
  }, [roomId]);

  // SSE subscription
  useEffect(() => {
    if (!roundId) return;
    setMessages([]);
    setDone(false);
    setSurvivors([]);
    setEjected(null);
    setPickedWinner(null);

    const es = new EventSource(`/api/dcn/stream?roundId=${roundId}`);
    const handle = (phase: string) => (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (phase === "stats") { setStats(data); return; }
      if (phase === "done") {
        setDone(true);
        setSurvivors(data.survivors || []);
        setEjected(data.ejected || null);
        es.close();
        return;
      }
      setMessages((prev) => [...prev, data]);
    };
    for (const p of ["think", "roast", "vote", "system", "stats", "done"]) {
      es.addEventListener(p, handle(p));
    }
    es.onerror = () => es.close();
    return () => es.close();
  }, [roundId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const startRound = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dcn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), roomId }),
      });
      const data = await res.json();
      if (data.roundId) setRoundId(data.roundId);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setPrompt(""); }
  }, [prompt, loading, roomId]);

  // Get survivor answers from messages
  const survivorAnswers = survivors.map((s) => {
    const thinkMsg = messages.find((m) => m.phase === "think" && m.displayName === s.displayName);
    return { ...s, answer: thinkMsg?.message || "" };
  });

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3"
        style={{ background: "var(--bg-card)", borderBottom: "1.5px solid var(--border-light)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, color: "var(--accent-blue)" }}>
            verse
          </Link>
          <span style={{ color: "var(--border-mid)" }}>›</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">{room?.icon}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 600 }}>{room?.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {room?.agents.map((a) => {
            const p = AGENT_PROFILES[a];
            if (!p) return null;
            const isEjected = ejected?.displayName === p.name;
            return (
              <div
                key={a}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${isEjected ? "opacity-30 grayscale" : ""}`}
                style={{ background: "var(--bg-elevated)", border: `2px solid ${AGENT_COLORS[a] || "var(--border-light)"}` }}
                title={`${p.name} — ${p.specialty}`}
              >
                {p.avatar}
              </div>
            );
          })}
          <Link
            href="/rooms"
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "var(--bg-elevated)", color: "var(--text-dim)", fontFamily: "var(--font-body)" }}
          >
            All Rooms
          </Link>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
            {/* Initial prompt display */}
            {initialPrompt && messages.length === 0 && !roundId && (
              <div className="text-center py-8" style={{ color: "var(--text-dim)", fontFamily: "var(--font-body)", fontSize: "14px" }}>
                Loading round...
              </div>
            )}

            {!roundId && !initialPrompt && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
                <div className="text-4xl animate-float">{room?.icon || "⚡"}</div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Ask something to start a debate
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-dim)" }}>
                  Agents will answer, roast each other, and you pick the winner
                </p>
              </div>
            )}

            {/* Messages */}
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isSystem = msg.phase === "system";
                const agentColor = AGENT_COLORS[msg.displayName] || "var(--text-dim)";
                const isEjectedAgent = ejected?.agent === msg.agent && msg.phase !== "system";
                const isEjectionMsg = isSystem && msg.message.includes("EJECTED");

                if (isSystem) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`text-center py-2 ${isEjectionMsg ? "my-2" : ""}`}
                    >
                      {isEjectionMsg ? (
                        <div
                          className="inline-block px-5 py-2.5 rounded-xl animate-flash-border"
                          style={{ background: "var(--accent-red-soft)", border: "2px solid var(--accent-red)", fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 600, color: "var(--accent-red)" }}
                        >
                          {msg.message}
                        </div>
                      ) : msg.message.includes("──") ? (
                        <div className="flex items-center gap-3 justify-center py-1">
                          <div className="h-px flex-1 max-w-[60px]" style={{ background: "var(--border-light)" }} />
                          <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.05em" }}>
                            {msg.message.replace(/──/g, "").trim()}
                          </span>
                          <div className="h-px flex-1 max-w-[60px]" style={{ background: "var(--border-light)" }} />
                        </div>
                      ) : (
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: msg.message.includes("earned") ? "#059669" : "var(--text-dim)" }}>
                          {msg.message}
                        </span>
                      )}
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: isEjectedAgent ? 0.4 : 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`p-4 rounded-2xl transition-all ${isEjectedAgent ? "grayscale" : ""}`}
                    style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-light)", borderLeftWidth: "3px", borderLeftColor: agentColor, boxShadow: "var(--shadow-sm)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{msg.avatar}</span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 600, color: agentColor }}>
                          {msg.displayName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {msg.x402Amount && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#059669" }}>{msg.x402Amount}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PILL_CLASS[msg.phase] || ""}`}>
                          {msg.phase.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", lineHeight: 1.65, color: "var(--text-secondary)" }}>
                      {msg.message}
                    </p>
                    {msg.voteTarget && (
                      <p className="mt-1.5" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--accent-purple)" }}>
                        → voted to eject {msg.voteTarget.slice(0, 10)}...
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing indicator */}
            {!done && messages.length > 0 && (
              <div className="flex items-center gap-2 pl-3 py-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full animate-pulse-soft" style={{ background: "var(--accent-blue)", animationDelay: `${i * 0.2}s` }} />
                ))}
                <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-dim)" }}>agents deliberating...</span>
              </div>
            )}

            {/* ── SURVIVOR PICK ── */}
            {done && survivors.length >= 2 && !pickedWinner && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl mt-4"
                style={{ background: "var(--accent-blue-soft)", border: "2px solid var(--accent-blue)", boxShadow: "var(--shadow-glow-blue)" }}
              >
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 700, color: "var(--accent-blue)", marginBottom: "4px" }}>
                  Pick the winner!
                </h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                  Two agents survived. Choose the best answer — they get the bounty.
                </p>
                <div className="grid gap-3">
                  {survivorAnswers.map((s) => {
                    const profile = Object.values(AGENT_PROFILES).find((p) => p.name === s.displayName);
                    const color = AGENT_COLORS[profile?.name === "CIPHER" ? "CIPHER" : profile?.name === "SAGE" ? "SAGE" : "SPARK"] || "var(--accent-blue)";
                    return (
                      <button
                        key={s.agent}
                        onClick={() => setPickedWinner(s.agent)}
                        className="p-4 rounded-xl text-left transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer"
                        style={{ background: "var(--bg-card)", border: "2px solid var(--border-light)", borderLeftWidth: "4px", borderLeftColor: color }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span>{profile?.avatar}</span>
                          <span style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, color }}>{s.displayName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "var(--accent-green-soft)", color: "#059669" }}>SURVIVOR</span>
                        </div>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                          {s.answer.slice(0, 300)}{s.answer.length > 300 ? "..." : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Winner announced */}
            {pickedWinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl mt-4 text-center"
                style={{ background: "var(--accent-green-soft)", border: "2px solid var(--accent-green)", boxShadow: "var(--shadow-glow-green)" }}
              >
                <div className="text-3xl mb-2">🏆</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "#059669" }}>
                  {survivors.find((s) => s.agent === pickedWinner)?.displayName} wins!
                </h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Bounty awarded on-chain via real USDC
                </p>
              </motion.div>
            )}
          </div>

          {/* Stats bar */}
          {roundId && (
            <div
              className="flex items-center justify-between px-5 py-2"
              style={{ borderTop: "1px solid var(--border-light)", background: "var(--bg-card)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}
            >
              <span>x402: <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>{stats.totalPayments}</span></span>
              <span>cost: <span style={{ color: "#059669", fontWeight: 600 }}>${stats.totalSpent}</span></span>
              <span style={{ color: done ? "#059669" : "var(--accent-orange)" }}>{done ? "✓ ROUND COMPLETE" : "● LIVE"}</span>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 flex gap-3" style={{ background: "var(--bg-card)", borderTop: "1.5px solid var(--border-light)" }}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startRound()}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border outline-none text-sm"
              style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", fontFamily: "var(--font-body)" }}
            />
            <button
              onClick={startRound}
              disabled={loading || !prompt.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 hover:scale-[1.02]"
              style={{ background: "var(--accent-blue)", fontFamily: "var(--font-display)" }}
            >
              {loading ? "..." : "Ask"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
