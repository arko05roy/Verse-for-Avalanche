"use client";
import { motion } from "framer-motion";

interface TxEntry {
  action: string;
  txHash?: string;
  timestamp: number;
  detail?: string;
}

interface TxFeedProps {
  entries: TxEntry[];
}

export function TxFeed({ entries }: TxFeedProps) {
  return (
    <div className="border border-zinc-800 bg-zinc-950 p-4 max-h-80 overflow-y-auto">
      <h3 className="text-sm font-bold text-green-400 mb-3">ACTIVITY</h3>
      {entries.length === 0 ? (
        <p className="text-xs text-zinc-600">Waiting for activity...</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs border-l-2 border-zinc-800 pl-3 py-1"
            >
              <div className="text-zinc-400">{entry.action}</div>
              {entry.detail && (
                <div className="text-zinc-600 mt-0.5">{entry.detail}</div>
              )}
              {entry.txHash && (
                <a
                  href={`https://testnet.snowtrace.io/tx/${entry.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-500 hover:text-green-400 mt-0.5 block font-mono"
                >
                  {entry.txHash.slice(0, 10)}...
                </a>
              )}
              <div className="text-zinc-700 mt-0.5">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
