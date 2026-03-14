"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AGENT_PROFILES } from "../../../lib/agent-profiles";
import MessageContent from "../../../components/MessageContent";

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

interface MarketData {
  question: string;
  url: string;
  outcomes: { name: string; price: string }[];
  volume: string;
  liquidity: string;
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

const PHASE_META: Record<string, { icon: string; label: string; color: string }> = {
  think: { icon: "💭", label: "Analysis", color: "var(--accent-cyan)" },
  roast: { icon: "🔥", label: "Roast", color: "var(--accent-amber)" },
  vote: { icon: "🗳️", label: "Vote", color: "var(--accent-purple)" },
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params);
  const searchParams = useSearchParams();
  const initialRoundId = searchParams.get("roundId");
  const initialPrompt = searchParams.get("prompt");

  const [room, setRoom] = useState<Room | null>(null);
  const [prompt, setPrompt] = useState("");
  const [roundId, setRoundId] = useState<string | null>(initialRoundId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [stats, setStats] = useState<Stats>({ totalPayments: 0, totalSpent: "0" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [survivors, setSurvivors] = useState<{ agent: string; displayName: string; earned: string }[]>([]);
  const [ejected, setEjected] = useState<{ agent: string; displayName: string } | null>(null);
  const [pickedWinner, setPickedWinner] = useState<string | null>(null);
  const [pickResult, setPickResult] = useState<{ winner: { displayName: string; earned: string }; runnerUp: { displayName: string; earned: string } } | null>(null);
  const [marketsExpanded, setMarketsExpanded] = useState(true);
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
    setMarkets([]);
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
    es.addEventListener("markets", (e: MessageEvent) => {
      const data: MarketData[] = JSON.parse(e.data);
      setMarkets(data);
    });
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

  // Group messages by phase for visual separation
  const groupedMessages: { phase: string; messages: ChatMessage[] }[] = [];
  let currentPhase = "";
  for (const msg of messages) {
    if (msg.phase !== currentPhase && msg.phase !== "system") {
      currentPhase = msg.phase;
      groupedMessages.push({ phase: msg.phase, messages: [msg] });
    } else if (msg.phase === "system") {
      groupedMessages.push({ phase: "system", messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1]?.messages.push(msg);
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

      {/* Main content area: chat + optional market sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Chat column */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
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

            {/* Messages grouped by phase */}
            <AnimatePresence initial={false}>
              {groupedMessages.map((group, gi) => {
                const phaseMeta = PHASE_META[group.phase];

                // Phase divider header (non-system)
                if (group.phase !== "system" && phaseMeta) {
                  return (
                    <div key={`group-${gi}`} className="chat-phase-group">
                      {/* Phase header */}
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 pt-5 pb-2 px-1"
                      >
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                          style={{
                            background: `${phaseMeta.color}10`,
                            border: `1px solid ${phaseMeta.color}25`,
                          }}
                        >
                          <span className="text-sm">{phaseMeta.icon}</span>
                          <span style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: phaseMeta.color,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}>
                            {phaseMeta.label}
                          </span>
                        </div>
                        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${phaseMeta.color}20, transparent)` }} />
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)" }}>
                          {group.messages.length} response{group.messages.length !== 1 ? "s" : ""}
                        </span>
                      </motion.div>

                      {/* Messages in this phase */}
                      <div className="space-y-3 pl-1">
                        {group.messages.map((msg, mi) => {
                          const agentColor = AGENT_COLORS[msg.displayName] || "var(--text-dim)";
                          const isEjectedAgent = ejected?.agent === msg.agent;
                          const profile = AGENT_PROFILES[msg.displayName];

                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, x: -12, y: 6 }}
                              animate={{ opacity: isEjectedAgent ? 0.25 : 1, x: 0, y: 0 }}
                              transition={{ duration: 0.35, delay: mi * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                              className={`chat-message-card rounded-xl overflow-hidden transition-all ${isEjectedAgent ? "grayscale" : ""}`}
                              style={{
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-dim)",
                                boxShadow: isEjectedAgent ? "none" : `inset 0 0 40px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)`,
                              }}
                            >
                              {/* Colored top accent bar */}
                              <div style={{
                                height: "2px",
                                background: `linear-gradient(90deg, ${agentColor}, ${agentColor}60, transparent)`,
                              }} />

                              <div className="p-4">
                                {/* Agent header row */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    {/* Avatar with ring */}
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                                      style={{
                                        background: `${agentColor}15`,
                                        border: `2px solid ${agentColor}`,
                                        boxShadow: `0 0 12px ${agentColor}30`,
                                      }}
                                    >
                                      {msg.avatar}
                                    </div>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span style={{
                                          fontFamily: "var(--font-display)",
                                          fontSize: "14px",
                                          fontWeight: 700,
                                          color: agentColor,
                                          textShadow: `0 0 20px ${agentColor}40`,
                                          letterSpacing: "0.02em",
                                        }}>
                                          {msg.displayName}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${PILL_CLASS[msg.phase] || ""}`} style={{ letterSpacing: "0.06em" }}>
                                          {msg.phase.toUpperCase()}
                                        </span>
                                      </div>
                                      {profile && (
                                        <span style={{
                                          fontFamily: "var(--font-mono)",
                                          fontSize: "10px",
                                          color: "var(--text-dim)",
                                          marginTop: "1px",
                                        }}>
                                          {profile.specialty}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    {msg.x402Amount && (
                                      <span
                                        className="px-2 py-0.5 rounded-full"
                                        style={{
                                          fontFamily: "var(--font-mono)",
                                          fontSize: "10px",
                                          fontWeight: 600,
                                          color: "var(--accent-green)",
                                          background: "var(--accent-green-soft)",
                                          border: "1px solid rgba(0,255,136,0.15)",
                                        }}
                                      >
                                        {msg.x402Amount}
                                      </span>
                                    )}
                                    <span style={{
                                      fontFamily: "var(--font-mono)",
                                      fontSize: "9px",
                                      color: "var(--text-dim)",
                                      opacity: 0.5,
                                    }}>
                                      {formatTime(msg.timestamp)}
                                    </span>
                                  </div>
                                </div>

                                {/* Message body */}
                                <div className="pl-12">
                                  <MessageContent content={msg.message} agentColor={agentColor} />
                                  {msg.voteTarget && (
                                    <div
                                      className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                                      style={{
                                        background: "var(--accent-magenta-soft)",
                                        border: "1px solid rgba(255,45,123,0.15)",
                                      }}
                                    >
                                      <span style={{ fontSize: "12px" }}>🗳️</span>
                                      <span style={{
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        color: "var(--accent-magenta)",
                                      }}>
                                        Voted to eject {msg.voteTarget.slice(0, 10)}...
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // System messages
                return group.messages.map((msg) => {
                  const isEjectionMsg = msg.message.includes("EJECTED");
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`text-center py-2.5 ${isEjectionMsg ? "my-4" : ""}`}
                    >
                      {isEjectionMsg ? (
                        <div
                          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl animate-flash-border"
                          style={{
                            background: "var(--accent-red-glow)",
                            border: "1px solid var(--accent-red)",
                            fontFamily: "var(--font-display)",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--accent-red)",
                            letterSpacing: "0.06em",
                            textShadow: "0 0 20px rgba(255,59,59,0.4)",
                            boxShadow: "0 0 30px rgba(255,59,59,0.15)",
                          }}
                        >
                          <span style={{ fontSize: "16px" }}>💀</span>
                          {msg.message}
                        </div>
                      ) : msg.message.includes("──") ? (
                        <div className="flex items-center gap-4 justify-center py-1">
                          <div className="h-px flex-1 max-w-[80px]" style={{ background: "linear-gradient(90deg, transparent, var(--border-mid), transparent)" }} />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                            {msg.message.replace(/──/g, "").trim()}
                          </span>
                          <div className="h-px flex-1 max-w-[80px]" style={{ background: "linear-gradient(90deg, transparent, var(--border-mid), transparent)" }} />
                        </div>
                      ) : (
                        <span style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          color: msg.message.includes("earned") ? "var(--accent-green)" : "var(--text-dim)",
                          textShadow: msg.message.includes("earned") ? "0 0 8px rgba(0,255,136,0.3)" : "none",
                        }}>
                          {msg.message}
                        </span>
                      )}
                    </motion.div>
                  );
                });
              })}
            </AnimatePresence>

            {/* Typing indicator */}
            {!done && messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 pl-3 py-4"
              >
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-typing" style={{ background: "var(--accent-cyan)", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.03em" }}>
                  agents deliberating...
                </span>
              </motion.div>
            )}

            {/* ── SURVIVOR PICK ── */}
            {done && survivors.length >= 2 && !pickedWinner && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl mt-5 overflow-hidden"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--accent-cyan)",
                  boxShadow: "var(--shadow-glow-cyan)",
                }}
              >
                <div className="p-6 pb-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🏆</span>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--accent-cyan)", letterSpacing: "0.03em" }}>
                      Pick the winner
                    </h3>
                  </div>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-dim)" }}>
                    Two agents survived the debate. Choose the best analysis — they get the bounty.
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  {survivorAnswers.map((s) => {
                    const color = AGENT_COLORS[s.displayName] || "var(--accent-cyan)";
                    const profile = AGENT_PROFILES[s.displayName];
                    return (
                      <button
                        key={s.agent}
                        onClick={() => pickWinner(s.agent)}
                        className="w-full rounded-xl text-left transition-all hover:scale-[1.005] cursor-pointer overflow-hidden group"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border-dim)",
                          boxShadow: `inset 0 0 20px rgba(0,0,0,0.2)`,
                        }}
                      >
                        <div style={{ height: "2px", background: `linear-gradient(90deg, ${color}, ${color}40, transparent)`, transition: "all 0.3s" }} />
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                              style={{
                                background: `${color}15`,
                                border: `2px solid ${color}`,
                                boxShadow: `0 0 12px ${color}30`,
                              }}
                            >
                              {profile?.avatar}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color, textShadow: `0 0 10px ${color}` }}>{s.displayName}</span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "var(--accent-green-soft)", color: "var(--accent-green)", border: "1px solid rgba(0,255,136,0.2)" }}>SURVIVOR</span>
                              </div>
                              {profile && (
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>{profile.specialty}</span>
                              )}
                            </div>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "var(--font-display)", fontSize: "12px", color: "var(--accent-cyan)", letterSpacing: "0.06em" }}>
                              SELECT →
                            </div>
                          </div>
                          <div className="pl-13">
                            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                              {s.answer.slice(0, 400)}{s.answer.length > 400 ? "..." : ""}
                            </p>
                          </div>
                        </div>
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
                className="rounded-xl mt-5 text-center overflow-hidden"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--accent-green)",
                  boxShadow: "var(--shadow-glow-green)",
                }}
              >
                <div style={{ height: "3px", background: "linear-gradient(90deg, transparent, var(--accent-green), transparent)" }} />
                <div className="p-8">
                  <div className="text-5xl mb-4">🏆</div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700, color: "var(--accent-green)", textShadow: "0 0 20px rgba(0,255,136,0.3)", letterSpacing: "0.02em" }}>
                    {survivors.find((s) => s.agent === pickedWinner)?.displayName} wins!
                  </h3>
                  {pickResult ? (
                    <div className="mt-6 flex justify-center gap-5">
                      <div
                        className="px-6 py-4 rounded-xl"
                        style={{ background: "var(--bg-elevated)", border: "1px solid var(--accent-green)", boxShadow: "0 0 20px rgba(0,255,136,0.1)" }}
                      >
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--accent-green)" }}>
                          {pickResult.winner.displayName}
                        </div>
                        <div className="neon-green" style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 700, margin: "6px 0" }}>
                          ${pickResult.winner.earned}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>winner (70%)</div>
                      </div>
                      <div
                        className="px-6 py-4 rounded-xl"
                        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}
                      >
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)" }}>
                          {pickResult.runnerUp.displayName}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 700, color: "var(--text-secondary)", margin: "6px 0" }}>
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
                </div>
              </motion.div>
            )}
          </div>

          {/* Market Panel — collapsible bottom section */}
          {markets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="border-t market-panel"
              style={{ borderColor: "var(--border-dim)", background: "var(--bg-panel)" }}
            >
              {/* Toggle header */}
              <button
                onClick={() => setMarketsExpanded((v) => !v)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                <div
                  className="w-2 h-2 rounded-full animate-glow-pulse"
                  style={{ background: "var(--accent-cyan)", boxShadow: "0 0 8px var(--accent-cyan)" }}
                />
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--accent-cyan)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}>
                  Polymarket Live
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-full"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "var(--accent-cyan)",
                    background: "var(--accent-cyan-soft)",
                    border: "1px solid rgba(0,229,255,0.15)",
                  }}
                >
                  {markets.length}
                </span>
                <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(0,229,255,0.12), transparent)" }} />
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--text-dim)",
                  transform: marketsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                  display: "inline-block",
                }}>
                  ▾
                </span>
              </button>

              {/* Market cards */}
              <AnimatePresence>
                {marketsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="market-ticker-scroll flex gap-3 px-4 pb-3.5 overflow-x-auto">
                      {markets.map((market, i) => {
                        const lead = market.outcomes[0];
                        const leadPct = lead ? parseFloat(lead.price) : 0;
                        const accent = leadPct >= 70 ? "#00ff88" : leadPct <= 30 ? "#ff3b3b" : "#ffaa00";
                        return (
                          <a
                            key={i}
                            href={market.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="market-ticker-card group"
                            style={{
                              minWidth: "280px",
                              maxWidth: "320px",
                              flex: "0 0 auto",
                              background: "var(--bg-card)",
                              border: "1px solid var(--border-dim)",
                              borderRadius: "12px",
                              padding: "14px 16px",
                              textDecoration: "none",
                              position: "relative",
                              overflow: "hidden",
                              transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                            }}
                          >
                            {/* Top glow line */}
                            <div style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              height: "2px",
                              background: `linear-gradient(90deg, transparent, ${accent}50, transparent)`,
                            }} />

                            {/* External link indicator */}
                            <div
                              className="absolute top-3 right-3 opacity-0 group-hover:opacity-60 transition-opacity"
                              style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}
                            >
                              ↗
                            </div>

                            <p style={{
                              fontFamily: "var(--font-body)",
                              fontSize: "12px",
                              lineHeight: 1.4,
                              color: "var(--text-primary)",
                              fontWeight: 600,
                              marginBottom: "12px",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}>
                              {market.question}
                            </p>

                            {/* Outcomes with bigger bars */}
                            <div className="flex flex-col gap-2 mb-3">
                              {market.outcomes.slice(0, 2).map((outcome, j) => {
                                const pct = parseFloat(outcome.price) || 0;
                                return (
                                  <div key={j} className="flex items-center gap-2.5">
                                    <span style={{
                                      fontFamily: "var(--font-mono)",
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      color: j === 0 ? accent : "var(--text-dim)",
                                      width: "30px",
                                      flexShrink: 0,
                                    }}>
                                      {outcome.name}
                                    </span>
                                    <div className="flex-1 h-[7px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                                        className="h-full rounded-full"
                                        style={{
                                          background: j === 0
                                            ? `linear-gradient(90deg, ${accent}66, ${accent})`
                                            : "rgba(255,255,255,0.08)",
                                          boxShadow: j === 0 ? `0 0 10px ${accent}50` : "none",
                                        }}
                                      />
                                    </div>
                                    <span style={{
                                      fontFamily: "var(--font-mono)",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      color: j === 0 ? accent : "var(--text-dim)",
                                      minWidth: "46px",
                                      textAlign: "right",
                                      textShadow: j === 0 ? `0 0 12px ${accent}60` : "none",
                                    }}>
                                      {outcome.price}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Footer stats */}
                            <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--border-dim)" }}>
                              <div className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)" }}>
                                <span style={{ opacity: 0.5 }}>VOL</span>
                                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{market.volume}</span>
                              </div>
                              <div style={{ width: "1px", height: "10px", background: "var(--border-dim)" }} />
                              <div className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)" }}>
                                <span style={{ opacity: 0.5 }}>LIQ</span>
                                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{market.liquidity}</span>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Stats bar */}
          {roundId && (
            <div
              className="flex items-center justify-between px-5 py-2.5 border-t"
              style={{ borderColor: "var(--border-dim)", background: "var(--bg-panel)", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}
            >
              <div className="flex items-center gap-4">
                <span>x402: <span className="neon-cyan" style={{ fontWeight: 600 }}>{stats.totalPayments}</span></span>
                <span>cost: <span className="neon-green" style={{ fontWeight: 600 }}>${stats.totalSpent}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: done ? "var(--accent-green)" : "var(--accent-amber)",
                    boxShadow: done ? "0 0 6px var(--accent-green)" : "0 0 6px var(--accent-amber)",
                    animation: done ? "none" : "glow-pulse 1.5s ease-in-out infinite",
                  }}
                />
                <span style={{
                  color: done ? "var(--accent-green)" : "var(--accent-amber)",
                  textShadow: done ? "0 0 10px rgba(0,255,136,0.3)" : "0 0 10px rgba(255,170,0,0.3)",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}>
                  {done ? "ROUND COMPLETE" : "LIVE"}
                </span>
              </div>
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
              placeholder="Ask a question to start a debate..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border outline-none text-sm transition-all placeholder:text-[var(--text-dim)]"
              style={{
                background: "var(--bg-card)",
                borderColor: prompt ? "var(--accent-cyan)" : "var(--border-dim)",
                fontFamily: "var(--font-body)",
                color: "var(--text-primary)",
                boxShadow: prompt ? "0 0 15px rgba(0,229,255,0.08), inset 0 0 20px rgba(0,229,255,0.03)" : "none",
              }}
            />
            <button
              onClick={startRound}
              disabled={loading || !prompt.trim()}
              className="px-7 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98]"
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
