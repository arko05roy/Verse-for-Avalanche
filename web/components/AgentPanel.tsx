"use client";

import { AGENT_PROFILES } from "../lib/agent-profiles";
import { motion } from "framer-motion";

interface AgentStatus {
  agent: string;
  profileKey: string;
  status: string;
  earnings?: string;
}

const AGENT_ACCENT: Record<string, string> = {
  CIPHER: "var(--accent-cyan)",
  SAGE: "var(--accent-green)",
  SPARK: "var(--accent-amber)",
};

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; glow: boolean }> = {
  idle: { label: "STANDBY", dotColor: "var(--text-dim)", glow: false },
  thinking: { label: "WORKING", dotColor: "var(--accent-cyan)", glow: true },
  roasting: { label: "JUDGING", dotColor: "var(--accent-amber)", glow: true },
  voting: { label: "VOTING", dotColor: "var(--accent-purple)", glow: true },
  ejected: { label: "EJECTED", dotColor: "var(--accent-red)", glow: false },
  survived: { label: "SURVIVED", dotColor: "var(--accent-green)", glow: false },
};

export default function AgentPanel({
  agents,
  ejected,
  roundHistory,
}: {
  agents: AgentStatus[];
  ejected?: { agent: string; displayName: string; slashAmount: string } | null;
  roundHistory?: { roundNum: number; ejectedName: string }[];
}) {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Section label */}
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-4 rounded-full" style={{ background: "var(--accent-cyan)", boxShadow: "0 0 6px var(--accent-cyan)" }} />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "var(--text-dim)",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
          }}
        >
          Network Nodes
        </span>
      </div>

      {/* Agent cards */}
      {agents.map((a, i) => {
        const p = AGENT_PROFILES[a.profileKey];
        if (!p) return null;
        const isEjected = ejected?.agent === a.agent;
        const accent = AGENT_ACCENT[a.profileKey] || "var(--text-dim)";
        const st = STATUS_CONFIG[a.status] || STATUS_CONFIG.idle;

        return (
          <motion.div
            key={a.agent}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: isEjected ? 0.35 : 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.35 }}
            className={`rounded-lg p-4 border transition-all relative overflow-hidden ${
              isEjected ? "grayscale" : ""
            }`}
            style={{
              background: "var(--bg-card)",
              borderColor: isEjected ? "var(--accent-red)" : "var(--border-dim)",
              borderLeft: `2px solid ${isEjected ? "var(--accent-red)" : accent}`,
              boxShadow: isEjected
                ? "inset 0 0 20px rgba(255,59,59,0.05)"
                : st.glow
                ? `inset 0 0 30px rgba(0,0,0,0.3), 0 0 1px ${accent}`
                : "none",
            }}
          >
            {/* Glow bar */}
            {st.glow && (
              <div
                className="absolute top-0 left-0 right-0 h-px animate-glow-pulse"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
              />
            )}

            {/* Name + status */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: st.dotColor,
                    boxShadow: st.glow ? `0 0 10px ${st.dotColor}` : "none",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: isEjected ? "var(--accent-red)" : accent,
                    letterSpacing: "0.06em",
                    textShadow: isEjected ? "0 0 15px rgba(255,59,59,0.4)" : `0 0 15px ${accent}`,
                  }}
                >
                  {p.name}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "8px",
                  fontWeight: 600,
                  color: st.dotColor,
                  letterSpacing: "0.15em",
                  padding: "2px 6px",
                  border: `1px solid ${st.dotColor}`,
                  borderRadius: "3px",
                  opacity: 0.7,
                }}
              >
                {isEjected ? "EJECTED" : st.label}
              </span>
            </div>

            {/* Specialty */}
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "11px",
                color: "var(--text-secondary)",
                marginBottom: "4px",
              }}
            >
              {p.specialty}
            </div>

            {/* Judge persona */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "var(--text-dim)",
                fontStyle: "italic",
                opacity: 0.7,
              }}
            >
              validates as {p.judgeName}
            </div>

            {/* Address */}
            <div
              className="mt-2.5 pt-2.5 border-t"
              style={{
                borderColor: "var(--border-dim)",
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "var(--text-dim)",
                opacity: 0.6,
              }}
            >
              {a.agent ? `${a.agent.slice(0, 6)}...${a.agent.slice(-4)}` : "..."}
            </div>

            {/* Slash info */}
            {isEjected && ejected && (
              <div
                className="mt-2.5 px-3 py-1.5 rounded"
                style={{
                  background: "var(--accent-red-glow)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--accent-red)",
                  textShadow: "0 0 10px rgba(255,59,59,0.3)",
                  letterSpacing: "0.03em",
                }}
              >
                slashed {ejected.slashAmount} USDC
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Ejection history */}
      {roundHistory && roundHistory.length > 0 && (
        <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border-dim)" }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-1 h-3 rounded-full" style={{ background: "var(--accent-red)", boxShadow: "0 0 6px var(--accent-red)" }} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "var(--text-dim)",
                letterSpacing: "0.25em",
              }}
            >
              KILL FEED
            </span>
          </div>
          <div className="space-y-2">
            {roundHistory.slice(0, 8).map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--text-dim)",
                }}
              >
                <span style={{ color: "var(--accent-red)", opacity: 0.5 }}>&#x2716;</span>
                <span style={{ opacity: 0.5 }}>R{r.roundNum}</span>
                <span style={{ color: "var(--text-secondary)" }}>{r.ejectedName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
