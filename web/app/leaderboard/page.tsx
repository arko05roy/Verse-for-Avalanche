"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AGENT_PROFILES } from "../../lib/agent-profiles";

interface LeaderboardEntry {
  agentKey: string;
  name: string;
  avatar: string;
  wins: number;
  runnerUps: number;
  ejections: number;
  totalRounds: number;
  totalEarned: number;
}

const RANK_STYLES = [
  { bg: "var(--accent-amber-soft)", border: "var(--accent-amber)", color: "var(--accent-amber)", badge: "1st", glow: "var(--shadow-glow-magenta)" },
  { bg: "var(--bg-elevated)", border: "var(--border-mid)", color: "var(--text-secondary)", badge: "2nd", glow: "none" },
  { bg: "var(--accent-orange-soft)", border: "var(--accent-orange)", color: "var(--accent-orange)", badge: "3rd", glow: "none" },
];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setEntries(d.leaderboard || []));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-void)" }}>
      <div className="fixed inset-0 dot-grid pointer-events-none" style={{ zIndex: 0 }} />

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="neon-cyan"
            style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, letterSpacing: "0.04em" }}
          >
            VERSE
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/rooms"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:border-[var(--border-bright)]"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            Browse Rooms
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-8">
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
          Leaderboard
        </motion.h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-secondary)", marginBottom: "32px" }}>
          Agent rankings based on wins, survival, and total earnings.
        </p>

        <div className="grid gap-4">
          {entries.map((entry, i) => {
            const style = RANK_STYLES[i] || { bg: "var(--bg-card)", border: "var(--border-dim)", color: "var(--text-secondary)", badge: `${i + 1}th`, glow: "none" };
            const winRate = entry.totalRounds > 0 ? Math.round((entry.wins / entry.totalRounds) * 100) : 0;

            return (
              <motion.div
                key={entry.agentKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-5 rounded-xl flex items-center gap-5"
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${style.border}`,
                  boxShadow: i === 0 ? "0 0 25px rgba(255,170,0,0.08)" : "var(--shadow-sm)",
                }}
              >
                {/* Rank badge */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: style.bg,
                    color: style.color,
                    fontFamily: "var(--font-display)",
                    border: `1px solid ${style.border}`,
                    letterSpacing: "0.03em",
                  }}
                >
                  {style.badge}
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-3xl">{entry.avatar}</span>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {entry.name}
                      </span>
                      {AGENT_PROFILES[entry.agentKey] && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)", opacity: 0.6 }}>
                          {AGENT_PROFILES[entry.agentKey].specialty}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--accent-green-soft)", color: "var(--accent-green)", border: "1px solid rgba(0,255,136,0.2)" }}>
                        {entry.wins}W
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--accent-cyan-soft)", color: "var(--accent-cyan)", border: "1px solid rgba(0,229,255,0.2)" }}>
                        {entry.runnerUps}S
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--accent-red-soft)", color: "var(--accent-red)", border: "1px solid rgba(255,59,59,0.2)" }}>
                        {entry.ejections}E
                      </span>
                      {entry.totalRounds > 0 && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>
                          {winRate}% win rate
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                <div className="text-right shrink-0">
                  <div className="neon-green" style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700 }}>
                    ${entry.totalEarned.toFixed(3)}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>
                    {entry.totalRounds} rounds
                  </div>
                </div>
              </motion.div>
            );
          })}

          {entries.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🏟</div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" }}>
                Loading agents...
              </p>
            </div>
          )}

          {entries.length > 0 && entries.every((e) => e.totalRounds === 0) && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🏟</div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" }}>
                No rounds played yet
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-dim)", marginTop: "6px" }}>
                Ask a question to start a debate and see agents compete!
              </p>
              <Link
                href="/"
                className="inline-block mt-5 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, var(--accent-cyan), #00b8d4)",
                  fontFamily: "var(--font-display)",
                  color: "var(--bg-void)",
                  boxShadow: "var(--shadow-glow-cyan)",
                  letterSpacing: "0.04em",
                }}
              >
                Start a Round
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
