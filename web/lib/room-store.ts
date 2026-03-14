/**
 * Room Store — manages debate rooms with specialized agents
 */

export interface Room {
  id: string;
  name: string;
  domain: string;
  icon: string;
  description: string;
  agents: string[]; // profile keys from agent-profiles.ts
  createdAt: number;
  activeRounds: number;
  totalRounds: number;
}

// Domain-specific rooms with specialized agent lineups
const DEFAULT_ROOMS: Room[] = [
  {
    id: "security",
    name: "Security Audit",
    domain: "security",
    icon: "🛡️",
    description: "Smart contract audits, vulnerability hunting, exploit analysis, defense architecture",
    agents: ["SENTINEL", "FORTRESS", "PHANTOM"],
    createdAt: Date.now(),
    activeRounds: 0,
    totalRounds: 0,
  },
  {
    id: "yield",
    name: "DeFi Yield",
    domain: "yield",
    icon: "💰",
    description: "Yield farming, LP strategies, risk-adjusted returns, DeFi protocol analysis",
    agents: ["HARVESTER", "GUARDIAN", "NAVIGATOR"],
    createdAt: Date.now(),
    activeRounds: 0,
    totalRounds: 0,
  },
  {
    id: "prediction",
    name: "Prediction Markets",
    domain: "prediction",
    icon: "🔮",
    description: "Market predictions, event forecasting, Polymarket analysis, contrarian bets",
    agents: ["ORACLE", "PROPHET", "CONTRARIAN"],
    createdAt: Date.now(),
    activeRounds: 0,
    totalRounds: 0,
  },
  {
    id: "token",
    name: "Token Analysis",
    domain: "token",
    icon: "🔍",
    description: "Token due diligence, on-chain analysis, fundamental evaluation, sentiment tracking",
    agents: ["DETECTIVE", "AUDITOR", "RADAR"],
    createdAt: Date.now(),
    activeRounds: 0,
    totalRounds: 0,
  },
  {
    id: "wallet",
    name: "Wallet Intelligence",
    domain: "wallet",
    icon: "👛",
    description: "Wallet profiling, transaction tracing, whale tracking, smart money analysis",
    agents: ["TRACKER", "PROFILER", "WHALE"],
    createdAt: Date.now(),
    activeRounds: 0,
    totalRounds: 0,
  },
];

// Use globalThis to persist across Next.js module re-evaluations in dev mode
const globalRooms = (globalThis as any).__verse_rooms as Map<string, Room> | undefined;
const rooms: Map<string, Room> = globalRooms || new Map();
if (!globalRooms) {
  for (const r of DEFAULT_ROOMS) rooms.set(r.id, r);
  (globalThis as any).__verse_rooms = rooms;
}

export const roomStore = {
  get(id: string): Room | undefined {
    return rooms.get(id);
  },

  getAll(): Room[] {
    return Array.from(rooms.values());
  },

  create(room: Omit<Room, "createdAt" | "activeRounds" | "totalRounds">): Room {
    const full: Room = { ...room, createdAt: Date.now(), activeRounds: 0, totalRounds: 0 };
    rooms.set(room.id, full);
    return full;
  },

  incrementRound(id: string) {
    const r = rooms.get(id);
    if (r) {
      r.activeRounds++;
      r.totalRounds++;
    }
  },

  decrementActive(id: string) {
    const r = rooms.get(id);
    if (r && r.activeRounds > 0) r.activeRounds--;
  },
};
