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
      // Step 1: Orchestrator parses intent
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      setRouting(data);

      // Step 2: Start round in assigned room
      const roundRes = await fetch("/api/dcn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), roomId: data.roomId }),
      });
      const roundData = await roundRes.json();

      // Step 3: Navigate to room with round
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
    <div className="min-h-screen dot-grid flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, color: "var(--accent-blue)" }}>
            verse
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: "var(--accent-yellow-soft)", color: "#b45309", fontFamily: "var(--font-mono)" }}
          >
            BETA
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/rooms"
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:shadow-md"
            style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-light)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            Browse Rooms
          </Link>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
        </div>
      </header>

      {/* Main — centered input */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-xl w-full"
        >
          {/* Floating agents */}
          <div className="flex justify-center gap-4 mb-8">
            {[
              { emoji: "🔵", name: "CIPHER", delay: 0 },
              { emoji: "🟢", name: "SAGE", delay: 0.3 },
              { emoji: "🟡", name: "SPARK", delay: 0.6 },
            ].map((a) => (
              <motion.div
                key={a.name}
                className="animate-float"
                style={{ animationDelay: `${a.delay}s` }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md"
                  style={{ background: "var(--bg-card)", border: "2px solid var(--border-light)" }}
                >
                  {a.emoji}
                </div>
              </motion.div>
            ))}
          </div>

          <h1
            className="mb-3"
            style={{ fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}
          >
            Ask anything.
            <br />
            <span style={{ color: "var(--accent-blue)" }}>Agents will fight about it.</span>
          </h1>

          <p className="mb-8" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Your question gets routed to specialized AI agents who answer, roast each other, and vote out the worst. You pick the final winner.
          </p>

          {/* Input */}
          <form onSubmit={handleSubmit} className="relative">
            <div
              className="flex items-center gap-3 p-2 rounded-2xl transition-all"
              style={{
                background: "var(--bg-card)",
                border: "2px solid var(--border-light)",
                boxShadow: prompt ? "var(--shadow-glow-blue)" : "var(--shadow-md)",
              }}
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What's on your mind?"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-transparent outline-none text-[15px]"
                style={{ fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "var(--accent-blue)",
                  fontFamily: "var(--font-display)",
                  boxShadow: "var(--shadow-glow-blue)",
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-xl"
                style={{ background: "var(--bg-card)", border: "2px solid var(--accent-blue)", boxShadow: "var(--shadow-glow-blue)" }}
              >
                <span className="text-xl">{routing.icon}</span>
                <div className="text-left">
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 600, color: "var(--accent-blue)" }}>
                    Routing to {routing.roomName}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-dim)" }}>
                    {routing.reason}
                  </div>
                </div>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-blue)", borderTopColor: "transparent" }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick room links */}
          <div className="flex justify-center gap-2 mt-10">
            {[
              { id: "code", icon: "💻", name: "Code" },
              { id: "research", icon: "🔬", name: "Research" },
              { id: "creative", icon: "🎨", name: "Creative" },
              { id: "general", icon: "⚡", name: "Open" },
            ].map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
              >
                <Link
                  href={`/room/${r.id}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all hover:shadow-md hover:scale-[1.03]"
                  style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-light)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
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
      <footer className="px-6 py-4 text-center">
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}>
          Avalanche Fuji · Real USDC · x402 Protocol · Groq AI
        </span>
      </footer>
    </div>
  );
}
