"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  phase: "think" | "roast" | "vote" | "system";
  agent: string;
  displayName: string;
  avatar: string;
  message: string;
  score?: number;
  voteTarget?: string;
  x402Amount?: string;
  timestamp: number;
}

interface Stats {
  totalPayments: number;
  totalSpent: string;
}

const AGENT_COLORS: Record<string, string> = {
  CIPHER: "var(--accent-cyan)",
  SAGE: "var(--accent-green)",
  SPARK: "var(--accent-amber)",
};

const PHASE_CONFIG: Record<string, { label: string; icon: string; cssClass: string }> = {
  think: { label: "THINK", icon: "▣", cssClass: "phase-think" },
  roast: { label: "ROAST", icon: "◈", cssClass: "phase-roast" },
  vote: { label: "VOTE", icon: "◉", cssClass: "phase-vote" },
  system: { label: "SYS", icon: "▸", cssClass: "phase-system" },
};

export default function ChatArena({
  roundId,
  onDone,
}: {
  roundId: string | null;
  onDone?: (data: any) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<Stats>({ totalPayments: 0, totalSpent: "0" });
  const [done, setDone] = useState(false);
  const [ejectedAgent, setEjectedAgent] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roundId) return;
    setMessages([]);
    setDone(false);
    setEjectedAgent(null);

    const es = new EventSource(`/api/dcn/stream?roundId=${roundId}`);

    const handleMsg = (phase: string) => (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (phase === "stats") { setStats(data); return; }
      if (phase === "done") {
        setDone(true);
        setEjectedAgent(data.ejected?.agent || null);
        onDone?.(data);
        es.close();
        return;
      }
      setMessages((prev) => [...prev, data]);
    };

    es.addEventListener("think", handleMsg("think"));
    es.addEventListener("roast", handleMsg("roast"));
    es.addEventListener("vote", handleMsg("vote"));
    es.addEventListener("system", handleMsg("system"));
    es.addEventListener("stats", handleMsg("stats"));
    es.addEventListener("done", handleMsg("done"));
    es.onerror = () => es.close();

    return () => es.close();
  }, [roundId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!roundId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8">
        {/* Idle state — terminal cursor */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-mid)",
              boxShadow: "var(--shadow-glow-cyan)",
            }}
          >
            <span className="text-3xl opacity-30 animate-pulse-soft" style={{ fontFamily: "var(--font-mono)" }}>_</span>
          </div>
          <div
            className="absolute -inset-1 rounded-2xl opacity-30"
            style={{
              background: "linear-gradient(135deg, var(--accent-cyan), transparent, var(--accent-magenta))",
              filter: "blur(8px)",
              zIndex: -1,
            }}
          />
        </div>
        <p
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-dim)",
            fontSize: "14px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Awaiting tribunal query
        </p>
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-typing"
              style={{ background: "var(--accent-cyan)", animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const phase = PHASE_CONFIG[msg.phase] || PHASE_CONFIG.system;
            const agentColor = AGENT_COLORS[msg.displayName] || "var(--text-dim)";
            const isEjected = ejectedAgent === msg.agent;
            const isSystem = msg.phase === "system";
            const isEjectionMsg = isSystem && msg.message.includes("EJECTED");

            if (isSystem) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`text-center py-3 ${isEjectionMsg ? "my-3" : ""}`}
                >
                  {isEjectionMsg ? (
                    <div
                      className="inline-block px-6 py-3 rounded-lg animate-flash-border"
                      style={{
                        background: "var(--accent-red-glow)",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderColor: "var(--accent-red)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "var(--accent-red)",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        textShadow: "0 0 20px rgba(255,59,59,0.4)",
                      }}
                    >
                      {msg.message}
                    </div>
                  ) : msg.message.includes("──") ? (
                    <div className="flex items-center gap-4 justify-center">
                      <div className="h-px flex-1 max-w-[80px]" style={{ background: "linear-gradient(90deg, transparent, var(--border-mid), transparent)" }} />
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          color: "var(--text-dim)",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                        }}
                      >
                        {msg.message.replace(/──/g, "").trim()}
                      </span>
                      <div className="h-px flex-1 max-w-[80px]" style={{ background: "linear-gradient(90deg, transparent, var(--border-mid), transparent)" }} />
                    </div>
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: msg.message.includes("earned") ? "var(--accent-green)" : "var(--text-secondary)",
                      }}
                    >
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
                animate={{ opacity: isEjected ? 0.3 : 1, x: 0, y: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`rounded-lg p-4 transition-all ${isEjected ? "grayscale" : ""}`}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-dim)",
                  borderLeft: `2px solid ${agentColor}`,
                  boxShadow: isEjected ? "none" : `inset 0 0 30px rgba(0,0,0,0.3), 0 0 1px ${agentColor}`,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: agentColor, boxShadow: `0 0 8px ${agentColor}` }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: agentColor,
                        letterSpacing: "0.06em",
                        textShadow: `0 0 20px ${agentColor}`,
                      }}
                    >
                      {msg.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {msg.x402Amount && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          color: "var(--accent-green)",
                          opacity: 0.7,
                        }}
                      >
                        {msg.x402Amount}
                      </span>
                    )}
                    <span
                      className={phase.cssClass}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.12em",
                        padding: "2px 8px",
                        borderRadius: "3px",
                        border: "1px solid currentColor",
                        opacity: 0.6,
                      }}
                    >
                      {phase.icon} {phase.label}
                    </span>
                  </div>
                </div>

                {/* Message body */}
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    lineHeight: 1.7,
                    color: "var(--text-secondary)",
                  }}
                >
                  {msg.message}
                </p>

                {/* Vote target */}
                {msg.voteTarget && (
                  <div
                    className="mt-2.5 flex items-center gap-2"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--accent-magenta)",
                    }}
                  >
                    <span style={{ opacity: 0.6 }}>&#x25B6;</span>
                    <span>eject {msg.voteTarget.slice(0, 10)}...</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {!done && messages.length > 0 && (
          <div className="flex items-center gap-3 pl-4 py-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-typing"
                  style={{
                    background: "var(--accent-cyan)",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.05em" }}>
              agents deliberating...
            </span>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div
        className="flex items-center justify-between px-5 py-2.5 border-t"
        style={{
          borderColor: "var(--border-dim)",
          background: "var(--bg-panel)",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
        }}
      >
        <div className="flex items-center gap-5">
          <span style={{ color: "var(--text-dim)" }}>
            x402 <span className="neon-cyan" style={{ fontSize: "11px" }}>{stats.totalPayments}</span>
          </span>
          <span style={{ color: "var(--text-dim)" }}>
            cost <span className="neon-green" style={{ fontSize: "11px" }}>${stats.totalSpent}</span>
          </span>
        </div>
        <span
          style={{
            color: done ? "var(--accent-green)" : "var(--accent-amber)",
            letterSpacing: "0.1em",
            textShadow: done ? "0 0 10px rgba(0,255,136,0.4)" : "0 0 10px rgba(255,170,0,0.3)",
          }}
        >
          {done ? "■ CONSENSUS REACHED" : "● ROUND ACTIVE"}
        </span>
      </div>
    </div>
  );
}
