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
  think: { label: "THINK", icon: "◆", cssClass: "phase-think" },
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
        <div className="w-16 h-16 rounded-full border border-[var(--border-mid)] flex items-center justify-center">
          <span className="text-2xl opacity-30">?</span>
        </div>
        <p style={{ fontFamily: "var(--font-display)", color: "var(--text-dim)", fontSize: "15px", letterSpacing: "0.02em" }}>
          Post a question to begin the tribunal
        </p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--border-mid)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
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
                  className={`text-center py-3 ${isEjectionMsg ? "my-2" : ""}`}
                >
                  {isEjectionMsg ? (
                    <div
                      className="inline-block px-5 py-2.5 rounded border animate-border-flash"
                      style={{
                        background: "var(--accent-red-glow)",
                        borderColor: "var(--accent-red)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "var(--accent-red)",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {msg.message}
                    </div>
                  ) : msg.message.includes("──") ? (
                    <div className="flex items-center gap-3 justify-center">
                      <div className="h-px flex-1 max-w-[80px]" style={{ background: "var(--border-dim)" }} />
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          color: "var(--text-dim)",
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                        }}
                      >
                        {msg.message.replace(/──/g, "").trim()}
                      </span>
                      <div className="h-px flex-1 max-w-[80px]" style={{ background: "var(--border-dim)" }} />
                    </div>
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
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
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isEjected ? 0.35 : 1, x: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`rounded-lg p-3.5 border transition-all ${isEjected ? "grayscale" : ""}`}
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border-dim)",
                  borderLeft: `2px solid ${agentColor}`,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: agentColor, boxShadow: `0 0 6px ${agentColor}` }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: agentColor,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {msg.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
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
                        letterSpacing: "0.1em",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        border: "1px solid currentColor",
                        opacity: 0.7,
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
                    lineHeight: 1.6,
                    color: "var(--text-secondary)",
                  }}
                >
                  {msg.message}
                </p>

                {/* Vote target */}
                {msg.voteTarget && (
                  <div
                    className="mt-2 flex items-center gap-1.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--accent-purple)",
                    }}
                  >
                    <span>&#x25B6;</span>
                    <span>eject {msg.voteTarget.slice(0, 10)}...</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {!done && messages.length > 0 && (
          <div className="flex items-center gap-2 pl-4 py-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-typing"
                  style={{
                    background: "var(--text-dim)",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>
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
        <div className="flex items-center gap-4">
          <span style={{ color: "var(--text-dim)" }}>
            x402 <span style={{ color: "var(--accent-cyan)" }}>{stats.totalPayments}</span>
          </span>
          <span style={{ color: "var(--text-dim)" }}>
            cost <span style={{ color: "var(--accent-green)" }}>${stats.totalSpent}</span>
          </span>
        </div>
        <span style={{ color: done ? "var(--accent-green)" : "var(--text-dim)" }}>
          {done ? "CONSENSUS REACHED" : "ROUND ACTIVE"}
        </span>
      </div>
    </div>
  );
}
