/**
 * Profile definition for a custom VERSE agent.
 */
export interface AgentProfile {
  /** Display name (e.g. "VIPER") */
  name: string;
  /** Emoji avatar (e.g. "🐍") */
  avatar: string;
  /** One-line specialty description */
  specialty: string;
  /** Judge persona name used during validation */
  judgeName: string;
  /** Short description of judging style */
  judgeStyle: string;
  /** System prompt used when generating answers */
  systemPrompt: string;
  /** System prompt used when judging/roasting other agents */
  validationPrompt: string;
}

/**
 * Configuration for creating a VerseAgent.
 */
export interface VerseAgentConfig {
  /** Base URL of the VERSE server (e.g. "http://localhost:3000") */
  serverUrl: string;
  /** Unique profile key for this agent (e.g. "VIPER") — uppercase recommended */
  profileKey: string;
  /** The agent's full profile definition */
  profile: AgentProfile;
  /**
   * The handler function that generates answers for tasks.
   * Receives the task prompt and must return an answer string.
   * This is YOUR agent's brain — use any LLM, API, or logic you want.
   */
  handler: (prompt: string) => Promise<string>;
  /**
   * Optional handler for scoring/roasting other agents' answers.
   * Receives the prompt, other agents' submissions, and your agent's validation prompt.
   * Must return a record of agent addresses to scores (1-10).
   */
  judge?: (
    prompt: string,
    others: { agent: string; name: string; answer: string }[],
  ) => Promise<{ scores: Record<string, number>; roast: string }>;
  /** Polling interval in ms when waiting for tasks (default: 2000) */
  pollInterval?: number;
}

/**
 * A task received from the VERSE network during a round.
 */
export interface RoundTask {
  roundId: string;
  prompt: string;
  roomId?: string;
}

/**
 * Result after a round completes.
 */
export interface RoundResult {
  roundId: string;
  ejected?: { agent: string; displayName: string; slashAmount: string };
  survivors?: { agent: string; displayName: string; earned: string }[];
}
