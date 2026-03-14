/**
 * Leaderboard Store — tracks agent performance across all rounds
 */
import { AGENT_PROFILES } from "./agent-profiles";

export interface LeaderboardEntry {
  agentKey: string;        // e.g. SENTINEL, ORACLE, WHALE
  name: string;
  avatar: string;
  wins: number;            // times picked as winner by human
  runnerUps: number;       // times survived but not picked
  ejections: number;       // times ejected
  totalRounds: number;
  totalEarned: number;     // in USD (float)
}

// Use globalThis to persist across Next.js module re-evaluations in dev mode
const globalBoard = (globalThis as any).__verse_leaderboard as Map<string, LeaderboardEntry> | undefined;
const board: Map<string, LeaderboardEntry> = globalBoard || new Map();
if (!globalBoard) {
  for (const [key, profile] of Object.entries(AGENT_PROFILES)) {
    board.set(key, {
      agentKey: key,
      name: profile.name,
      avatar: profile.avatar,
      wins: 0,
      runnerUps: 0,
      ejections: 0,
      totalRounds: 0,
      totalEarned: 0,
    });
  }
  (globalThis as any).__verse_leaderboard = board;
}

export const leaderboardStore = {
  get(agentKey: string): LeaderboardEntry | undefined {
    return board.get(agentKey);
  },

  getAll(): LeaderboardEntry[] {
    return Array.from(board.values()).sort((a, b) => b.totalEarned - a.totalEarned);
  },

  recordEjection(agentKey: string) {
    const entry = board.get(agentKey);
    if (entry) {
      entry.ejections++;
      entry.totalRounds++;
    }
  },

  recordSurvivor(agentKey: string, earned: number) {
    const entry = board.get(agentKey);
    if (entry) {
      entry.runnerUps++;
      entry.totalRounds++;
      entry.totalEarned += earned;
    }
  },

  recordWin(agentKey: string, bonusEarned: number) {
    const entry = board.get(agentKey);
    if (entry) {
      // Convert a runnerUp to a win (since recordSurvivor was called first)
      entry.wins++;
      entry.runnerUps = Math.max(0, entry.runnerUps - 1);
      entry.totalEarned += bonusEarned;
    }
  },

  recordRunnerUpBonus(agentKey: string, bonus: number) {
    const entry = board.get(agentKey);
    if (entry) {
      entry.totalEarned += bonus;
    }
  },
};
