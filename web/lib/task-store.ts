export interface TaskEntry {
  verseId: string;
  prompt: string;
  bounty: string;
  poster: string;
  submissions: { agentAddress: string; answer: string; timestamp: number }[];
  votes: {
    voterAddress: string;
    scores: Record<string, number>;
    timestamp: number;
  }[];
  status: "pending" | "submitted" | "validating" | "finalized";
  rewards?: { agentAddress: string; amount: string }[];
  txHash?: string;
  consensusProgress?: string;
}

const tasks: Map<string, TaskEntry> = new Map();

export const taskStore = {
  create(
    verseId: string,
    entry: { prompt: string; bounty: string; poster: string }
  ): void {
    tasks.set(verseId, {
      ...entry,
      verseId,
      submissions: [],
      votes: [],
      status: "pending",
    });
  },

  get(verseId: string): TaskEntry | undefined {
    return tasks.get(verseId);
  },

  addSubmission(verseId: string, agentAddress: string, answer: string): void {
    const task = tasks.get(verseId);
    if (!task) return;
    if (task.submissions.find((s) => s.agentAddress === agentAddress)) return;
    task.submissions.push({ agentAddress, answer, timestamp: Date.now() });
    if (task.submissions.length >= 2) {
      task.status = "submitted";
    }
  },

  addVotes(
    verseId: string,
    voterAddress: string,
    scores: Record<string, number>
  ): void {
    const task = tasks.get(verseId);
    if (!task) return;
    if (task.votes.find((v) => v.voterAddress === voterAddress)) return;
    task.votes.push({ voterAddress, scores, timestamp: Date.now() });
    task.status = "validating";
    task.consensusProgress = `${task.votes.length} votes`;
  },

  finalize(
    verseId: string,
    rewards: { agentAddress: string; amount: string }[],
    txHash: string
  ): void {
    const task = tasks.get(verseId);
    if (!task) return;
    task.status = "finalized";
    task.rewards = rewards;
    task.txHash = txHash;
  },

  getAll(): TaskEntry[] {
    return Array.from(tasks.values());
  },

  getPending(): TaskEntry[] {
    return Array.from(tasks.values()).filter((t) => t.status === "pending");
  },

  getReadyToValidate(): TaskEntry[] {
    return Array.from(tasks.values()).filter(
      (t) => t.status === "submitted" && t.submissions.length >= 2
    );
  },

  hasVoted(verseId: string, voterAddress: string): boolean {
    const task = tasks.get(verseId);
    if (!task) return false;
    return task.votes.some((v) => v.voterAddress === voterAddress);
  },
};
