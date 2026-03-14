export interface ChatMessage {
  id: string;
  phase: "think" | "roast" | "vote" | "system";
  agent: string;
  displayName: string;
  avatar: string;
  message: string;
  score?: number;
  voteTarget?: string;
  x402Amount?: string;
  timestamp: number;
}

export interface Round {
  id: string;
  prompt: string;
  messages: ChatMessage[];
  status: "running" | "done";
  ejected?: { agent: string; displayName: string; slashAmount: string };
  survivors?: { agent: string; displayName: string; earned: string }[];
  txHash?: string;
  totalPayments: number;
  totalSpent: number;
}

const rounds: Map<string, Round> = new Map();

export const roundStore = {
  create(id: string, prompt: string): Round {
    const round: Round = {
      id,
      prompt,
      messages: [],
      status: "running",
      totalPayments: 0,
      totalSpent: 0,
    };
    rounds.set(id, round);
    return round;
  },

  get(id: string): Round | undefined {
    return rounds.get(id);
  },

  pushMessage(id: string, msg: ChatMessage) {
    const round = rounds.get(id);
    if (!round) return;
    round.messages.push(msg);
  },

  addPayment(id: string, amount: number) {
    const round = rounds.get(id);
    if (!round) return;
    round.totalPayments++;
    round.totalSpent += amount;
  },

  finalize(
    id: string,
    ejected?: Round["ejected"],
    survivors?: Round["survivors"],
    txHash?: string
  ) {
    const round = rounds.get(id);
    if (!round) return;
    round.status = "done";
    round.ejected = ejected;
    round.survivors = survivors;
    round.txHash = txHash;
  },

  getMessages(id: string, afterIndex: number): ChatMessage[] {
    const round = rounds.get(id);
    if (!round) return [];
    return round.messages.slice(afterIndex);
  },

  getAll(): Round[] {
    return Array.from(rounds.values());
  },

  getStats() {
    const all = Array.from(rounds.values());
    return {
      totalRounds: all.length,
      totalEjections: all.filter((r) => r.ejected).length,
      totalPayments: all.reduce((s, r) => s + r.totalPayments, 0),
      totalSpent: all.reduce((s, r) => s + r.totalSpent, 0),
    };
  },
};
