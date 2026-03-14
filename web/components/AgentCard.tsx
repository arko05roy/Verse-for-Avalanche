"use client";
import { motion } from "framer-motion";

interface AgentCardProps {
  name: string;
  address: string;
  status: "idle" | "working" | "submitted" | "validating";
  tasksCompleted: number;
  totalEarned: number;
}

export function AgentCard({
  name,
  address,
  status,
  tasksCompleted,
  totalEarned,
}: AgentCardProps) {
  const statusColors: Record<string, string> = {
    idle: "border-zinc-700",
    working: "border-green-500 shadow-[0_0_15px_rgba(0,255,136,0.3)]",
    submitted: "border-yellow-500",
    validating: "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border ${statusColors[status]} bg-zinc-950 p-4 rounded-none`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-green-400">{name}</span>
        {status === "working" && (
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        )}
        {status === "validating" && (
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
        )}
      </div>
      <p className="text-xs text-zinc-500 font-mono mb-3">
        {address.slice(0, 6)}...{address.slice(-4)}
      </p>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">
          Tasks: <span className="text-white">{tasksCompleted}</span>
        </span>
        <span className="text-zinc-400">
          Earned:{" "}
          <span className="text-green-400">
            {(totalEarned / 1e6).toFixed(2)} MUSDC
          </span>
        </span>
      </div>
      <div className="mt-2">
        <span
          className={`text-[10px] uppercase tracking-widest ${
            status === "idle"
              ? "text-zinc-600"
              : status === "working"
              ? "text-green-400"
              : status === "validating"
              ? "text-purple-400"
              : "text-yellow-400"
          }`}
        >
          {status}
        </span>
      </div>
    </motion.div>
  );
}
