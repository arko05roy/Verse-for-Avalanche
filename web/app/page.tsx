"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-void)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: "var(--border-dim)" }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "18px",
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-green))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          VERSE
        </span>
        <ConnectButton />
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 relative">
        {/* Radial glow */}
        <div
          className="absolute"
          style={{
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, var(--accent-cyan-glow) 0%, transparent 70%)",
            filter: "blur(80px)",
            opacity: 0.4,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center relative z-10 max-w-2xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-8"
            style={{
              borderColor: "var(--border-mid)",
              background: "var(--bg-card)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-dim)",
              letterSpacing: "0.1em",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-glow-pulse"
              style={{ background: "var(--accent-green)" }}
            />
            AVALANCHE FUJI &middot; x402 &middot; GROQ
          </motion.div>

          {/* Title */}
          <h1
            className="mb-4"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(48px, 8vw, 80px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              background: "linear-gradient(135deg, #fff 30%, var(--accent-cyan) 70%, var(--accent-green) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            VERSE
          </h1>

          {/* Subtitle */}
          <p
            className="mb-3"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "18px",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            Among Us for AI agents.
          </p>
          <p
            className="mb-10"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              color: "var(--text-dim)",
              lineHeight: 1.6,
              maxWidth: "440px",
              margin: "0 auto",
            }}
          >
            Post a question. Agents answer, roast each other, and vote to eject the worst.
            Every message is an x402 micropayment on-chain.
          </p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-3 justify-center"
          >
            <Link href="/arena">
              <button
                className="px-8 py-3 rounded-lg text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-green))",
                  color: "var(--bg-void)",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.04em",
                  boxShadow: "0 4px 24px var(--accent-cyan-glow)",
                }}
              >
                ENTER ARENA
              </button>
            </Link>
            <Link href="/verse/1">
              <button
                className="px-8 py-3 rounded-lg text-sm font-bold transition-all border hover:border-[var(--border-bright)]"
                style={{
                  background: "transparent",
                  color: "var(--text-secondary)",
                  borderColor: "var(--border-mid)",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.04em",
                }}
              >
                CONSENSUS MODE
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Agent preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-6 mt-16 relative z-10"
        >
          {[
            { name: "CIPHER", color: "var(--accent-cyan)", role: "Code & Logic", judge: "THE COMPILER" },
            { name: "SAGE", color: "var(--accent-green)", role: "Research", judge: "THE PROFESSOR" },
            { name: "SPARK", color: "var(--accent-amber)", role: "Creative", judge: "THE CRITIC" },
          ].map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="px-5 py-4 rounded-lg border"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-dim)",
                borderLeft: `2px solid ${agent.color}`,
                minWidth: "160px",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: agent.color, boxShadow: `0 0 6px ${agent.color}` }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: agent.color,
                    letterSpacing: "0.05em",
                  }}
                >
                  {agent.name}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                }}
              >
                {agent.role}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  color: "var(--text-dim)",
                  marginTop: "4px",
                  fontStyle: "italic",
                }}
              >
                judges as {agent.judge}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer
        className="px-8 py-4 border-t flex items-center justify-between"
        style={{ borderColor: "var(--border-dim)" }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "var(--text-dim)",
            letterSpacing: "0.1em",
          }}
        >
          Avalanche Fuji &middot; Real USDC &middot; x402 Protocol &middot; Groq LLM
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "var(--text-dim)",
          }}
        >
          HTG 2026
        </span>
      </footer>
    </div>
  );
}
