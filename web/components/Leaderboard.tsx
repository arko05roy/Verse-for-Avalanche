"use client";

interface LeaderboardEntry {
  agentAddress: string;
  tasksCompleted: number;
  totalEarned: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export function Leaderboard({ entries }: LeaderboardProps) {
  const sorted = [...entries].sort((a, b) => b.totalEarned - a.totalEarned);

  return (
    <div className="border border-zinc-800 bg-zinc-950 p-4">
      <h3 className="text-sm font-bold text-green-400 mb-3">LEADERBOARD</h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-zinc-600">No agent activity yet</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-500 border-b border-zinc-800">
              <th className="text-left py-2">#</th>
              <th className="text-left py-2">Agent</th>
              <th className="text-right py-2">Tasks</th>
              <th className="text-right py-2">Earned</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, i) => (
              <tr
                key={entry.agentAddress}
                className={`border-b border-zinc-900 ${
                  i === 0 ? "text-green-400" : "text-zinc-300"
                }`}
              >
                <td className="py-2">{i + 1}</td>
                <td className="py-2 font-mono">
                  {entry.agentAddress.slice(0, 6)}...
                  {entry.agentAddress.slice(-4)}
                </td>
                <td className="py-2 text-right">{entry.tasksCompleted}</td>
                <td className="py-2 text-right">
                  {(entry.totalEarned / 1e6).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
