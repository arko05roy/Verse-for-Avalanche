"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AGENT_PROFILES } from "../../lib/agent-profiles";

interface Room {
  id: string;
  name: string;
  domain: string;
  icon: string;
  description: string;
  agents: string[];
  totalRounds: number;
  activeRounds: number;
}

// Agent tag colors — neon style
const AGENT_TAG_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  // Security
  SENTINEL: { bg: "rgba(255,68,68,0.08)", color: "#ff4444", border: "rgba(255,68,68,0.2)" },
  FORTRESS: { bg: "rgba(74,144,255,0.08)", color: "#4a90ff", border: "rgba(74,144,255,0.2)" },
  PHANTOM: { bg: "rgba(180,74,255,0.08)", color: "#b44aff", border: "rgba(180,74,255,0.2)" },
  // Yield
  HARVESTER: { bg: "rgba(255,170,0,0.08)", color: "#ffaa00", border: "rgba(255,170,0,0.2)" },
  GUARDIAN: { bg: "rgba(0,255,136,0.08)", color: "#00ff88", border: "rgba(0,255,136,0.2)" },
  NAVIGATOR: { bg: "rgba(0,229,255,0.08)", color: "#00e5ff", border: "rgba(0,229,255,0.2)" },
  // Prediction
  ORACLE: { bg: "rgba(99,102,241,0.08)", color: "#6366f1", border: "rgba(99,102,241,0.2)" },
  PROPHET: { bg: "rgba(255,45,123,0.08)", color: "#ff2d7b", border: "rgba(255,45,123,0.2)" },
  CONTRARIAN: { bg: "rgba(255,107,45,0.08)", color: "#ff6b2d", border: "rgba(255,107,45,0.2)" },
  // Token
  DETECTIVE: { bg: "rgba(0,212,170,0.08)", color: "#00d4aa", border: "rgba(0,212,170,0.2)" },
  AUDITOR: { bg: "rgba(136,150,170,0.08)", color: "#8896aa", border: "rgba(136,150,170,0.2)" },
  RADAR: { bg: "rgba(180,74,255,0.08)", color: "#b44aff", border: "rgba(180,74,255,0.2)" },
  // Wallet
  TRACKER: { bg: "rgba(0,184,255,0.08)", color: "#00b8ff", border: "rgba(0,184,255,0.2)" },
  PROFILER: { bg: "rgba(217,70,239,0.08)", color: "#d946ef", border: "rgba(217,70,239,0.2)" },
  WHALE: { bg: "rgba(74,144,255,0.08)", color: "#4a90ff", border: "rgba(74,144,255,0.2)" },
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    fetch("/api/rooms").then((r) => r.json()).then((d) => setRooms(d.rooms || []));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-void)" }}>
      {/* Subtle grid */}
      <div className="fixed inset-0 dot-grid pointer-events-none" style={{ zIndex: 0 }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="neon-cyan"
            style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, letterSpacing: "0.04em" }}
          >
            VERSE
          </span>
        </Link>
        <Link
          href="/leaderboard"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]"
          style={{
            background: "var(--accent-amber-soft)",
            border: "1px solid rgba(255,170,0,0.2)",
            color: "var(--accent-amber)",
            fontFamily: "var(--font-body)",
          }}
        >
          Leaderboard
        </Link>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "8px",
            letterSpacing: "0.02em",
          }}
        >
          Agent Rooms
        </motion.h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-secondary)", marginBottom: "28px" }}>
          Each room has specialized crypto agents that debate from different angles. Pick a room and ask a question.
        </p>

        {/* Room cards */}
        <div className="grid gap-4">
          {rooms.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={`/room/${room.id}`}>
                <div
                  className="p-5 rounded-xl flex items-center gap-5 transition-all hover:scale-[1.005] cursor-pointer group"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-dim)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:animate-wiggle"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}
                  >
                    {room.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
                        {room.name}
                      </span>
                      {room.activeRounds > 0 && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold animate-pulse-soft"
                          style={{ background: "var(--accent-green-soft)", color: "var(--accent-green)", border: "1px solid rgba(0,255,136,0.2)" }}
                        >
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs mb-2.5" style={{ color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>
                      {room.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {room.agents.map((a) => {
                        const p = AGENT_PROFILES[a];
                        const tagColor = AGENT_TAG_COLORS[a];
                        if (!p) return null;
                        return (
                          <span
                            key={a}
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              background: tagColor?.bg || "var(--bg-elevated)",
                              color: tagColor?.color || "var(--text-dim)",
                              border: `1px solid ${tagColor?.border || "var(--border-dim)"}`,
                            }}
                          >
                            {p.avatar} {p.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0">
                    <div className="neon-cyan" style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700 }}>
                      {room.totalRounds}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.05em" }}>rounds</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
