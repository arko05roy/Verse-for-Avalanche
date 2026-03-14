"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [routing, setRouting] = useState<{ roomId: string; roomName: string; icon: string; reason: string } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      setRouting(data);

      const roundRes = await fetch("/api/dcn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), roomId: data.roomId }),
      });
      const roundData = await roundRes.json();

      setTimeout(() => {
        router.push(`/room/${data.roomId}?roundId=${roundData.roundId}&prompt=${encodeURIComponent(prompt.trim())}`);
      }, 1200);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setRouting(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col ambient-glow" style={{ background: "var(--bg-void)" }}>
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 dot-grid pointer-events-none" style={{ zIndex: 0 }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span
            className="neon-cyan"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            VERSE
          </span>
          <span
            className="px-2.5 py-0.5 rounded text-[10px] font-bold"
            style={{
              background: "var(--accent-amber-soft)",
              color: "var(--accent-amber)",
              fontFamily: "var(--font-mono)",
              border: "1px solid rgba(255,170,0,0.2)",
              letterSpacing: "0.1em",
            }}
          >
            BETA
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/rooms"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:border-[var(--border-bright)]"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-dim)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body)",
            }}
          >
            Browse Rooms
          </Link>
          <Link
            href="/leaderboard"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md"
            style={{
              background: "var(--accent-amber-soft)",
              border: "1px solid rgba(255,170,0,0.2)",
              color: "var(--accent-amber)",
              fontFamily: "var(--font-body)",
            }}
          >
            Leaderboard
          </Link>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
        </div>
      </header>

      {/* Main — centered input */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center max-w-xl w-full"
        >
          {/* Floating agents */}
          <div className="flex justify-center gap-4 mb-10 flex-wrap">
            {[
              { emoji: "🔴", name: "SENTINEL", delay: 0, color: "var(--accent-red)" },
              { emoji: "🌾", name: "HARVESTER", delay: 0.15, color: "var(--accent-amber)" },
              { emoji: "📊", name: "ORACLE", delay: 0.3, color: "var(--accent-purple)" },
              { emoji: "🔎", name: "DETECTIVE", delay: 0.45, color: "var(--accent-cyan)" },
              { emoji: "🐋", name: "WHALE", delay: 0.6, color: "var(--accent-blue)" },
            ].map((a) => (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: a.delay + 0.3, duration: 0.4 }}
              >
                <div
                  className="animate-float"
                  style={{ animationDelay: `${a.delay}s` }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-mid)",
                      boxShadow: `0 0 15px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.2)`,
                    }}
                    title={a.name}
                  >
                    {a.emoji}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <h1
            className="mb-4"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "40px",
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            Ask anything.
            <br />
            <span className="neon-cyan">Agents will fight about it.</span>
          </h1>

          <p
            className="mb-10"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              maxWidth: "420px",
              margin: "0 auto 40px",
            }}
          >
            Your question gets routed to specialized crypto agents who answer, roast each other, and vote out the worst. You pick the final winner.
          </p>

          {/* Input */}
          <form onSubmit={handleSubmit} className="relative">
            <div
              className="flex items-center gap-3 p-2 rounded-xl transition-all"
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${prompt ? "var(--accent-cyan)" : "var(--border-mid)"}`,
                boxShadow: prompt ? "var(--shadow-glow-cyan)" : "var(--shadow-md)",
              }}
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Audit a contract, find yields, analyze a token..."
                disabled={loading}
                className="flex-1 px-4 py-3.5 bg-transparent outline-none text-[15px] placeholder:text-[var(--text-dim)]"
                style={{ fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="px-7 py-3.5 rounded-lg font-bold text-sm transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, var(--accent-cyan), #00b8d4)",
                  fontFamily: "var(--font-display)",
                  color: "var(--bg-void)",
                  letterSpacing: "0.04em",
                  boxShadow: "var(--shadow-glow-cyan)",
                }}
              >
                {loading ? "Routing..." : "Ask →"}
              </button>
            </div>
          </form>

          {/* Routing animation */}
          <AnimatePresence>
            {routing && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-xl"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--accent-cyan)",
                  boxShadow: "var(--shadow-glow-cyan)",
                }}
              >
                <span className="text-xl">{routing.icon}</span>
                <div className="text-left">
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, color: "var(--accent-cyan)" }}>
                    Routing to {routing.roomName}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-dim)" }}>
                    {routing.reason}
                  </div>
                </div>
                <div
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "var(--accent-cyan)", borderTopColor: "transparent" }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick room links */}
          <div className="flex justify-center gap-2.5 mt-12 flex-wrap">
            {[
              { id: "security", icon: "🛡️", name: "Security" },
              { id: "yield", icon: "💰", name: "Yield" },
              { id: "prediction", icon: "🔮", name: "Predictions" },
              { id: "token", icon: "🔍", name: "Token DD" },
              { id: "wallet", icon: "👛", name: "Wallet Intel" },
            ].map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
              >
                <Link
                  href={`/room/${r.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all hover:border-[var(--border-bright)] hover:scale-[1.03]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-dim)",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <span>{r.icon}</span>
                  {r.name}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-5 text-center">
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.08em" }}>
          Avalanche Fuji · Real USDC · x402 Protocol · Groq AI
        </span>
      </footer>
    </div>
  );
}
