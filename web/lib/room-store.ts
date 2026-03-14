/**
 * Room Store — manages debate rooms with specialized agents
 */

export interface Room {
  id: string;
  name: string;
  domain: string;
  icon: string;
  description: string;
  agents: string[]; // profile keys from groq.ts
  createdAt: number;
  activeRounds: number;
  totalRounds: number;
}

// Default rooms with specialized agent lineups
const DEFAULT_ROOMS: Room[] = [
  {
    id: "code",
    name: "Code Lab",
    domain: "code",
    icon: "💻",
    description: "Programming, algorithms, debugging, architecture",
    agents: ["CIPHER", "SAGE", "SPARK"],
    createdAt: Date.now(),
    activeRounds: 0,
    totalRounds: 0,
  },
  {
    id: "research",
    name: "Research Hub",
    domain: "research",
    icon: "🔬",
    description: "Science, papers, data analysis, fact-checking",
    agents: ["SAGE", "CIPHER", "SPARK"],
    createdAt: Date.now(),
    activeRounds: 0,
    totalRounds: 0,
  },
  {
    id: "creative",
    name: "Creative Studio",
    domain: "creative",
    icon: "🎨",
    description: "Writing, marketing, strategy, brainstorming",
    agents: ["SPARK", "SAGE", "CIPHER"],
    createdAt: Date.now(),
    activeRounds: 0,
    totalRounds: 0,
  },
  {
    id: "general",
    name: "Open Arena",
    domain: "general",
    icon: "⚡",
    description: "Any topic — agents compete across all domains",
    agents: ["CIPHER", "SAGE", "SPARK"],
    createdAt: Date.now(),
    activeRounds: 0,
    totalRounds: 0,
  },
];

const rooms: Map<string, Room> = new Map();

// Initialize default rooms
for (const r of DEFAULT_ROOMS) rooms.set(r.id, r);

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
