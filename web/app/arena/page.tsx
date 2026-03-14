"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useWalletClient, usePublicClient } from "wagmi";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import ChatArena from "../../components/ChatArena";
import AgentPanel from "../../components/AgentPanel";

const AGENTS = [
  { agent: process.env.NEXT_PUBLIC_AGENT1_ADDRESS || "", profileKey: "CIPHER" },
  { agent: process.env.NEXT_PUBLIC_AGENT2_ADDRESS || "", profileKey: "SAGE" },
  { agent: process.env.NEXT_PUBLIC_AGENT3_ADDRESS || "", profileKey: "SPARK" },
];

export default function ArenaPage() {
  const [prompt, setPrompt] = useState("");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ejected, setEjected] = useState<any>(null);
  const [roundCount, setRoundCount] = useState(0);
  const [history, setHistory] = useState<{ roundNum: number; ejectedName: string }[]>([]);
  const [error, setError] = useState("");
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [agentStatuses, setAgentStatuses] = useState<
    { agent: string; profileKey: string; status: string }[]
  >(AGENTS.map((a) => ({ ...a, status: "idle" })));

  const startRound = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setEjected(null);
    setError("");
    setAgentStatuses(AGENTS.map((a) => ({ ...a, status: "thinking" })));

    try {
      let fetchFn: typeof fetch = fetch;

      if (walletClient && publicClient) {
        const signer = toClientEvmSigner(
          {
            address: walletClient.account.address,
            async signTypedData(typedData: any) {
              return walletClient.signTypedData(typedData);
            },
          },
          {
            readContract: (args: any) => publicClient.readContract(args),
          }
        );
        const client = new x402Client();
        client.register("eip155:*", new ExactEvmScheme(signer));
        fetchFn = wrapFetchWithPayment(fetch, client);
      }

      const res = await fetchFn("/api/dcn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();
      if (data.roundId) {
        setRoundId(data.roundId);
        setRoundCount((c) => c + 1);
      } else if (data.error) {
        setError(data.error);
        setAgentStatuses(AGENTS.map((a) => ({ ...a, status: "idle" })));
      }
    } catch (err: any) {
      console.error("Failed to start round:", err);
      setError(err.message || "Failed to start round");
      setAgentStatuses(AGENTS.map((a) => ({ ...a, status: "idle" })));
    } finally {
      setLoading(false);
      setPrompt("");
    }
  }, [prompt, loading, walletClient, publicClient]);

  const handleDone = useCallback(
    (data: any) => {
      setEjected(data.ejected);
      if (data.ejected) {
        setHistory((h) => [
          { roundNum: roundCount + 1, ejectedName: data.ejected.displayName },
          ...h,
        ]);
      }
      setAgentStatuses(
        AGENTS.map((a) => ({
          ...a,
          status: data.ejected?.agent === a.agent ? "ejected" : "survived",
        }))
      );
    },
    [roundCount]
  );

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-void)" }}>
      {/* ─── HEADER ─── */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: "var(--border-dim)", background: "var(--bg-panel)" }}
      >
        <div className="flex items-center gap-4">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="neon-cyan"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            VERSE
          </motion.h1>
          <div className="h-4 w-px" style={{ background: "var(--border-mid)" }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-dim)",
              letterSpacing: "0.2em",
            }}
          >
            AGENT TRIBUNAL
          </span>
        </div>

        <div className="flex items-center gap-5">
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          <div className="flex items-center gap-2.5">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-dim)",
                letterSpacing: "0.1em",
              }}
            >
              ROUND
            </span>
            <span
              className="neon-cyan"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              #{roundCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-glow-pulse"
              style={{
                background: loading ? "var(--accent-amber)" : "var(--accent-green)",
                boxShadow: `0 0 8px ${loading ? "var(--accent-amber)" : "var(--accent-green)"}`,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: loading ? "var(--accent-amber)" : "var(--accent-green)",
                letterSpacing: "0.12em",
                textShadow: `0 0 10px ${loading ? "rgba(255,170,0,0.3)" : "rgba(0,255,136,0.3)"}`,
              }}
            >
              {loading ? "ACTIVE" : "READY"}
            </span>
          </div>
        </div>
      </header>

      {/* ─── MAIN AREA ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat column */}
        <div
          className="flex-1 flex flex-col border-r"
          style={{ borderColor: "var(--border-dim)" }}
        >
          <ChatArena roundId={roundId} onDone={handleDone} />
        </div>

        {/* Sidebar */}
        <div
          className="w-[280px] p-4 overflow-y-auto"
          style={{ background: "var(--bg-panel)" }}
        >
          <AgentPanel agents={agentStatuses} ejected={ejected} roundHistory={history} />
        </div>
      </div>

      {/* ─── INPUT BAR ─── */}
      <div
        className="px-5 py-3.5 border-t flex items-center gap-3"
        style={{ borderColor: "var(--border-dim)", background: "var(--bg-panel)" }}
      >
        {/* Protocol badge */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{
            borderColor: "var(--border-dim)",
            background: "var(--bg-card)",
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "var(--text-dim)" }}>x402</span>
          <span className="neon-green">$0.01</span>
        </div>

        {/* Input */}
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && startRound()}
          placeholder="What should the agents debate?"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-lg border outline-none transition-all placeholder:text-[var(--text-dim)]"
          style={{
            background: "var(--bg-card)",
            borderColor: prompt ? "var(--accent-cyan)" : "var(--border-dim)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            boxShadow: prompt ? "0 0 10px rgba(0,229,255,0.08)" : "none",
          }}
        />

        {/* Submit */}
        <button
          onClick={startRound}
          disabled={loading || !prompt.trim() || !walletClient}
          className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-25 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: loading
              ? "var(--bg-elevated)"
              : "linear-gradient(135deg, var(--accent-cyan), #00b8d4)",
            color: loading ? "var(--text-dim)" : "var(--bg-void)",
            fontFamily: "var(--font-display)",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            boxShadow: loading ? "none" : "var(--shadow-glow-cyan)",
          }}
        >
          {loading ? "PAYING..." : !walletClient ? "CONNECT WALLET" : "SUBMIT ($0.01)"}
        </button>
      </div>
      {error && (
        <div className="px-5 pb-2" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--accent-red)", textShadow: "0 0 10px rgba(255,59,59,0.3)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
