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

// Colors for all 15 agents
const AGENT_COLORS: Record<string, string> = {
  // Security
  SENTINEL: "#ff4444",
  FORTRESS: "#4a90ff",
  PHANTOM: "#b44aff",
  // Yield
  HARVESTER: "#ffaa00",
  GUARDIAN: "#00ff88",
  NAVIGATOR: "#00e5ff",
  // Prediction
  ORACLE: "#6366f1",
  PROPHET: "#ff2d7b",
  CONTRARIAN: "#ff6b2d",
  // Token
  DETECTIVE: "#00d4aa",
  AUDITOR: "#8896aa",
  RADAR: "#b44aff",
  // Wallet
  TRACKER: "#00b8ff",
  PROFILER: "#d946ef",
  WHALE: "#4a90ff",
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
  const [pickResult, setPickResult] = useState<{ winner: { displayName: string; earned: string }; runnerUp: { displayName: string; earned: string } } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/rooms").then((r) => r.json()).then((d) => {
      const found = d.rooms?.find((r: Room) => r.id === roomId);
      setRoom(found || { id: roomId, name: roomId, icon: "🛡️", description: "", agents: ["SENTINEL", "FORTRESS", "PHANTOM"] });
    });
  }, [roomId]);

  useEffect(() => {
    if (!roundId) return;
    setMessages([]);
    setDone(false);
    setSurvivors([]);
    setEjected(null);
    setPickedWinner(null);

    const es = new EventSource(`/api/dcn/stream?roundId=${roundId}`);
    const seenIds = new Set<string>();
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
      if (data.id && seenIds.has(data.id)) return; // deduplicate on reconnect
      if (data.id) seenIds.add(data.id);
      setMessages((prev) => [...prev, data]);
    };
    for (const p of ["think", "roast", "vote", "system", "stats", "done"]) {
      es.addEventListener(p, handle(p));
    }
    es.onerror = () => {
      // Let EventSource auto-reconnect instead of killing the connection
      if (es.readyState === EventSource.CLOSED) es.close();
    };
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

  const survivorAnswers = survivors.map((s) => {
    const thinkMsg = messages.find((m) => m.phase === "think" && m.displayName === s.displayName);
    return { ...s, answer: thinkMsg?.message || "" };
  });

  async function pickWinner(agentAddr: string) {
    setPickedWinner(agentAddr);
    try {
      const res = await fetch("/api/pick-winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, winnerAgent: agentAddr }),
      });
      const data = await res.json();
      if (data.success) setPickResult(data);
    } catch (err) {
      console.error("pick-winner error:", err);
    }
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-void)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ background: "var(--bg-panel)", borderColor: "var(--border-dim)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="neon-cyan"
            style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, letterSpacing: "0.04em" }}
          >
            VERSE
          </Link>
          <span style={{ color: "var(--border-mid)", fontFamily: "var(--font-mono)" }}>/</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">{room?.icon}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
              {room?.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {room?.agents.map((a) => {
            const p = AGENT_PROFILES[a];
            if (!p) return null;
            const isEjectedAgent = ejected?.displayName === p.name;
            const color = AGENT_COLORS[a] || "var(--text-dim)";
            return (
              <div
                key={a}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${isEjectedAgent ? "opacity-25 grayscale" : ""}`}
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${color}`,
                  boxShadow: isEjectedAgent ? "none" : `0 0 8px ${color}33`,
                }}
                title={`${p.name} — ${p.specialty}`}
              >
                <span className="text-sm">{p.avatar}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, color, letterSpacing: "0.03em" }}>
                  {p.name}
                </span>
              </div>
            );
          })}
          <Link
            href="/leaderboard"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--accent-amber-soft)", color: "var(--accent-amber)", fontFamily: "var(--font-body)", border: "1px solid rgba(255,170,0,0.2)" }}
          >
            Leaderboard
          </Link>
          <Link
            href="/rooms"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--bg-card)", color: "var(--text-dim)", fontFamily: "var(--font-body)", border: "1px solid var(--border-dim)" }}
          >
            All Rooms
          </Link>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {/* Initial prompt display */}
            {initialPrompt && messages.length === 0 && !roundId && (
              <div className="text-center py-8">
                <div className="flex justify-center gap-1.5 mb-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full animate-typing" style={{ background: "var(--accent-cyan)", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.05em" }}>
                  Loading round...
                </span>
              </div>
            )}

            {!roundId && !initialPrompt && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                <div className="text-5xl animate-float">{room?.icon || "🛡️"}</div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.02em" }}>
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
                      className={`text-center py-2.5 ${isEjectionMsg ? "my-3" : ""}`}
                    >
                      {isEjectionMsg ? (
                        <div
                          className="inline-block px-6 py-3 rounded-lg animate-flash-border"
                          style={{
                            background: "var(--accent-red-glow)",
                            border: "1px solid var(--accent-red)",
                            fontFamily: "var(--font-display)",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--accent-red)",
                            letterSpacing: "0.06em",
                            textShadow: "0 0 20px rgba(255,59,59,0.4)",
                          }}
                        >
                          {msg.message}
                        </div>
                      ) : msg.message.includes("──") ? (
                        <div className="flex items-center gap-4 justify-center py-1">
                          <div className="h-px flex-1 max-w-[60px]" style={{ background: "linear-gradient(90deg, transparent, var(--border-mid), transparent)" }} />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                            {msg.message.replace(/──/g, "").trim()}
                          </span>
                          <div className="h-px flex-1 max-w-[60px]" style={{ background: "linear-gradient(90deg, transparent, var(--border-mid), transparent)" }} />
                        </div>
                      ) : (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: msg.message.includes("earned") ? "var(--accent-green)" : "var(--text-dim)" }}>
                          {msg.message}
                        </span>
                      )}
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -10, y: 4 }}
                    animate={{ opacity: isEjectedAgent ? 0.3 : 1, x: 0, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={`p-4 rounded-lg transition-all ${isEjectedAgent ? "grayscale" : ""}`}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-dim)",
                      borderLeftWidth: "2px",
                      borderLeftColor: agentColor,
                      boxShadow: isEjectedAgent ? "none" : `inset 0 0 30px rgba(0,0,0,0.3), 0 0 1px ${agentColor}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{msg.avatar}</span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 600, color: agentColor, textShadow: `0 0 15px ${agentColor}` }}>
                          {msg.displayName}
                        </span>
                        {AGENT_PROFILES[msg.displayName] && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)", opacity: 0.6 }}>
                            {AGENT_PROFILES[msg.displayName].specialty}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        {msg.x402Amount && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--accent-green)" }}>{msg.x402Amount}</span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${PILL_CLASS[msg.phase] || ""}`} style={{ letterSpacing: "0.06em" }}>
                          {msg.phase.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", lineHeight: 1.7, color: "var(--text-secondary)" }}>
                      {msg.message}
                    </p>
                    {msg.voteTarget && (
                      <p className="mt-2" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--accent-magenta)" }}>
                        → voted to eject {msg.voteTarget.slice(0, 10)}...
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing indicator */}
            {!done && messages.length > 0 && (
              <div className="flex items-center gap-3 pl-3 py-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full animate-typing" style={{ background: "var(--accent-cyan)", animationDelay: `${i * 0.2}s` }} />
                ))}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.03em" }}>agents deliberating...</span>
              </div>
            )}

            {/* ── SURVIVOR PICK ── */}
            {done && survivors.length >= 2 && !pickedWinner && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl mt-4"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--accent-cyan)",
                  boxShadow: "var(--shadow-glow-cyan)",
                }}
              >
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "4px", letterSpacing: "0.03em" }}>
                  Pick the winner
                </h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-dim)", marginBottom: "20px" }}>
                  Two agents survived the debate. Choose the best analysis — they get the bounty.
                </p>
                <div className="grid gap-3">
                  {survivorAnswers.map((s) => {
                    const color = AGENT_COLORS[s.displayName] || "var(--accent-cyan)";
                    const profile = AGENT_PROFILES[s.displayName];
                    return (
                      <button
                        key={s.agent}
                        onClick={() => pickWinner(s.agent)}
                        className="p-4 rounded-lg text-left transition-all hover:scale-[1.01] cursor-pointer"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border-dim)",
                          borderLeftWidth: "3px",
                          borderLeftColor: color,
                          boxShadow: `inset 0 0 20px rgba(0,0,0,0.2)`,
                        }}
                      >
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <span>{profile?.avatar}</span>
                          <span style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, color, textShadow: `0 0 10px ${color}` }}>{s.displayName}</span>
                          {profile && (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)", opacity: 0.6 }}>{profile.specialty}</span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--accent-green-soft)", color: "var(--accent-green)", border: "1px solid rgba(0,255,136,0.2)" }}>SURVIVOR</span>
                        </div>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
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
                className="p-6 rounded-xl mt-4 text-center"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--accent-green)",
                  boxShadow: "var(--shadow-glow-green)",
                }}
              >
                <div className="text-4xl mb-3">🏆</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, color: "var(--accent-green)", textShadow: "0 0 20px rgba(0,255,136,0.3)" }}>
                  {survivors.find((s) => s.agent === pickedWinner)?.displayName} wins!
                </h3>
                {pickResult ? (
                  <div className="mt-4 flex justify-center gap-4">
                    <div
                      className="px-5 py-3 rounded-lg"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--accent-green)" }}
                    >
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, color: "var(--accent-green)" }}>
                        {pickResult.winner.displayName}
                      </div>
                      <div className="neon-green" style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700 }}>
                        ${pickResult.winner.earned}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>winner (70%)</div>
                    </div>
                    <div
                      className="px-5 py-3 rounded-lg"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}
                    >
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
                        {pickResult.runnerUp.displayName}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700, color: "var(--text-secondary)" }}>
                        ${pickResult.runnerUp.earned}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>runner-up (30%)</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px" }}>
                    Bounty awarded on-chain via real USDC
                  </p>
                )}
              </motion.div>
            )}
          </div>

          {/* Stats bar */}
          {roundId && (
            <div
              className="flex items-center justify-between px-5 py-2.5 border-t"
              style={{ borderColor: "var(--border-dim)", background: "var(--bg-panel)", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}
            >
              <span>x402: <span className="neon-cyan" style={{ fontWeight: 600 }}>{stats.totalPayments}</span></span>
              <span>cost: <span className="neon-green" style={{ fontWeight: 600 }}>${stats.totalSpent}</span></span>
              <span style={{
                color: done ? "var(--accent-green)" : "var(--accent-amber)",
                textShadow: done ? "0 0 10px rgba(0,255,136,0.3)" : "0 0 10px rgba(255,170,0,0.3)",
                letterSpacing: "0.08em",
              }}>
                {done ? "■ ROUND COMPLETE" : "● LIVE"}
              </span>
            </div>
          )}

          {/* Input */}
          <div
            className="px-4 py-3.5 flex gap-3 border-t"
            style={{ background: "var(--bg-panel)", borderColor: "var(--border-dim)" }}
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startRound()}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg border outline-none text-sm transition-all placeholder:text-[var(--text-dim)]"
              style={{
                background: "var(--bg-card)",
                borderColor: prompt ? "var(--accent-cyan)" : "var(--border-dim)",
                fontFamily: "var(--font-body)",
                color: "var(--text-primary)",
                boxShadow: prompt ? "0 0 10px rgba(0,229,255,0.08)" : "none",
              }}
            />
            <button
              onClick={startRound}
              disabled={loading || !prompt.trim()}
              className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, var(--accent-cyan), #00b8d4)",
                fontFamily: "var(--font-display)",
                color: "var(--bg-void)",
                letterSpacing: "0.04em",
                boxShadow: "var(--shadow-glow-cyan)",
              }}
            >
              {loading ? "..." : "Ask"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
