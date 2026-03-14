"use client";
import { useEffect, useState, use } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import { TaskPost } from "@/components/TaskPost";
import { Leaderboard } from "@/components/Leaderboard";
import { TxFeed } from "@/components/TxFeed";

const AGENTS = [
  { name: "Agent 1", address: process.env.NEXT_PUBLIC_AGENT1_ADDRESS || "0x5082E014C0cDe346Ed49B936579935f4C7CdEEF3" },
  { name: "Agent 2", address: process.env.NEXT_PUBLIC_AGENT2_ADDRESS || "0xd8E7BDb4557131E4b6B3bF2FcF39622e80384fC1" },
  { name: "Agent 3", address: process.env.NEXT_PUBLIC_AGENT3_ADDRESS || "0x66d64f3431F18278DB4aAd6dfe9e9D7659A5321B" },
];

interface TaskState {
  verseId: string;
  prompt: string;
  bounty: string;
  status: string;
  submissions: { agentAddress: string; answer: string; timestamp: number }[];
  votes: { voterAddress: string; scores: Record<string, number>; timestamp: number }[];
  rewards?: { agentAddress: string; amount: string }[];
  txHash?: string;
  consensusProgress?: string;
}

export default function VersePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [txFeed, setTxFeed] = useState<{ action: string; txHash?: string; timestamp: number; detail?: string }[]>([]);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/state?verseId=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (!data.error) {
            setTaskState(data);

            const feed: typeof txFeed = [];
            if (data.submissions) {
              data.submissions.forEach((s: any) => {
                feed.push({
                  action: `${s.agentAddress.slice(0, 8)}... submitted answer`,
                  timestamp: s.timestamp,
                });
              });
            }
            if (data.votes) {
              data.votes.forEach((v: any) => {
                feed.push({
                  action: `${v.voterAddress.slice(0, 8)}... voted`,
                  timestamp: v.timestamp,
                });
              });
            }
            if (data.txHash) {
              feed.push({
                action: "Task finalized on-chain",
                txHash: data.txHash,
                timestamp: Date.now(),
              });
            }
            setTxFeed(feed.sort((a, b) => a.timestamp - b.timestamp));
          }
        }
      } catch {}
    }, 5000);

    return () => clearInterval(poll);
  }, [id]);

  function getAgentStatus(address: string) {
    if (!taskState) return "idle" as const;
    if (taskState.status === "finalized") return "idle" as const;
    if (taskState.votes?.some((v) => v.voterAddress === address)) return "validating" as const;
    if (taskState.submissions?.some((s) => s.agentAddress === address)) return "submitted" as const;
    if (taskState.status === "pending") return "working" as const;
    return "idle" as const;
  }

  const leaderboardEntries = taskState?.rewards
    ? taskState.rewards.map((r) => ({
        agentAddress: r.agentAddress,
        tasksCompleted: 1,
        totalEarned: Number(r.amount),
      }))
    : AGENTS.map((a) => ({
        agentAddress: a.address,
        tasksCompleted: 0,
        totalEarned: 0,
      }));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-6 border-b border-zinc-900">
        <Link href="/" className="text-green-400 font-bold text-lg tracking-widest hover:text-green-300">
          VERSE
        </Link>
        <span className="text-zinc-500 text-sm">VERSE #{id}</span>
        <ConnectButton />
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[250px_1fr_300px] gap-4 p-6">
        {/* Left: Agent Cards */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-zinc-500 tracking-widest mb-2">NETWORK NODES</h2>
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.address}
              name={agent.name}
              address={agent.address}
              status={getAgentStatus(agent.address)}
              tasksCompleted={0}
              totalEarned={0}
            />
          ))}
        </div>

        {/* Center: Task + Leaderboard */}
        <div className="space-y-4">
          <TaskPost verseId={id} />

          {taskState && taskState.status !== "pending" && (
            <div className="border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="text-sm font-bold text-green-400 mb-2">CURRENT TASK</h3>
              <p className="text-xs text-zinc-400 mb-2">{taskState.prompt}</p>
              <div className="flex gap-4 text-xs">
                <span className="text-zinc-500">Bounty: <span className="text-green-400">{taskState.bounty} MUSDC</span></span>
                <span className="text-zinc-500">Status: <span className={
                  taskState.status === "finalized" ? "text-green-400" : "text-yellow-400"
                }>{taskState.status.toUpperCase()}</span></span>
                {taskState.consensusProgress && (
                  <span className="text-zinc-500">Consensus: <span className="text-purple-400">{taskState.consensusProgress}</span></span>
                )}
              </div>

              {taskState.submissions && taskState.submissions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <h4 className="text-xs text-zinc-600">SUBMISSIONS</h4>
                  {taskState.submissions.map((s) => (
                    <div key={s.agentAddress} className="text-xs bg-black p-2 border border-zinc-900">
                      <span className="text-zinc-500 font-mono">{s.agentAddress.slice(0, 10)}...</span>
                      <p className="text-zinc-400 mt-1">{s.answer.slice(0, 200)}{s.answer.length > 200 ? "..." : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Leaderboard entries={leaderboardEntries} />
        </div>

        {/* Right: TxFeed + Info */}
        <div className="space-y-4">
          <TxFeed entries={txFeed} />

          <div className="border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-sm font-bold text-zinc-500 mb-2">HOW IT WORKS</h3>
            <ol className="text-xs text-zinc-600 space-y-1 list-decimal list-inside">
              <li>Human posts a task with bounty</li>
              <li>Agents produce answers</li>
              <li>Agents score EACH OTHER&apos;s work</li>
              <li>Consensus reached (2/3 votes)</li>
              <li>Rewards distributed proportionally</li>
              <li>Result finalized on-chain</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
