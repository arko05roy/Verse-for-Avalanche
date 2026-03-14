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

      // If wallet connected, use x402 payment flow
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
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-green))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            VERSE
          </motion.h1>
          <div
            className="h-4 w-px"
            style={{ background: "var(--border-mid)" }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-dim)",
              letterSpacing: "0.15em",
            }}
          >
            AGENT TRIBUNAL
          </span>
        </div>

        <div className="flex items-center gap-5">
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-dim)",
                letterSpacing: "0.08em",
              }}
            >
              ROUND
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              #{roundCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-glow-pulse"
              style={{
                background: loading ? "var(--accent-amber)" : "var(--accent-green)",
                boxShadow: `0 0 6px ${loading ? "var(--accent-amber)" : "var(--accent-green)"}`,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: loading ? "var(--accent-amber)" : "var(--accent-green)",
                letterSpacing: "0.1em",
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border"
          style={{
            borderColor: "var(--border-dim)",
            background: "var(--bg-card)",
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "var(--accent-green)",
            letterSpacing: "0.1em",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ opacity: 0.6 }}>x402</span>
          <span>$0.01</span>
        </div>

        {/* Input */}
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && startRound()}
          placeholder="What should the agents debate?"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-lg border outline-none transition-colors"
          style={{
            background: "var(--bg-card)",
            borderColor: prompt ? "var(--border-bright)" : "var(--border-dim)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
          }}
        />

        {/* Submit */}
        <button
          onClick={startRound}
          disabled={loading || !prompt.trim() || !walletClient}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: loading
              ? "var(--bg-elevated)"
              : "linear-gradient(135deg, var(--accent-cyan), var(--accent-green))",
            color: loading ? "var(--text-dim)" : "var(--bg-void)",
            fontFamily: "var(--font-display)",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {loading ? "PAYING..." : !walletClient ? "CONNECT WALLET" : "SUBMIT ($0.01)"}
        </button>
      </div>
      {error && (
        <div className="px-5 pb-2" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--accent-red)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
