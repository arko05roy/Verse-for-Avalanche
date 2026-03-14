/**
 * External Agent Store — manages agents registered via the SDK.
 *
 * External agents register their profiles, then poll for tasks
 * and submit answers through the REST API.
 */

import type { AgentProfile } from "./agent-profiles";

export interface ExternalAgent {
  id: string;
  profileKey: string;
  profile: AgentProfile;
  registeredAt: number;
  /** Pending task for this agent to answer */
  pendingTask: {
    roundId: string;
    prompt: string;
    roomId?: string;
  } | null;
  /** Latest answer submitted */
  lastAnswer: {
    roundId: string;
    answer: string;
    submittedAt: number;
  } | null;
  /** Pending judge task */
  pendingJudge: {
    roundId: string;
    prompt: string;
    others: { agent: string; name: string; answer: string }[];
  } | null;
  /** Latest judge result */
  lastJudge: {
    roundId: string;
    scores: Record<string, number>;
    roast: string;
    submittedAt: number;
  } | null;
}

// Persist across Next.js dev reloads
const globalAgents = (globalThis as any).__verse_external_agents as Map<string, ExternalAgent> | undefined;
const agents: Map<string, ExternalAgent> = globalAgents || new Map();
if (!globalAgents) {
  (globalThis as any).__verse_external_agents = agents;
}

// Also maintain profile key -> profile mapping for the engine
const globalProfiles = (globalThis as any).__verse_external_profiles as Map<string, AgentProfile> | undefined;
const externalProfiles: Map<string, AgentProfile> = globalProfiles || new Map();
if (!globalProfiles) {
  (globalThis as any).__verse_external_profiles = externalProfiles;
}

export const externalAgentStore = {
  register(profileKey: string, profile: AgentProfile): ExternalAgent {
    const id = `ext-${profileKey.toLowerCase()}-${Date.now().toString(36)}`;
    const agent: ExternalAgent = {
      id,
      profileKey,
      profile,
      registeredAt: Date.now(),
      pendingTask: null,
      lastAnswer: null,
      pendingJudge: null,
      lastJudge: null,
    };
    agents.set(id, agent);
    externalProfiles.set(profileKey, profile);
    return agent;
  },

  get(id: string): ExternalAgent | undefined {
    return agents.get(id);
  },

  getByProfileKey(key: string): ExternalAgent | undefined {
    for (const a of agents.values()) {
      if (a.profileKey === key) return a;
    }
    return undefined;
  },

  getAll(): ExternalAgent[] {
    return Array.from(agents.values());
  },

  getProfile(profileKey: string): AgentProfile | undefined {
    return externalProfiles.get(profileKey);
  },

  getAllProfiles(): Map<string, AgentProfile> {
    return externalProfiles;
  },

  /** Assign a task to an external agent */
  assignTask(id: string, roundId: string, prompt: string, roomId?: string): void {
    const agent = agents.get(id);
    if (agent) {
      agent.pendingTask = { roundId, prompt, roomId };
      agent.lastAnswer = null;
    }
  },

  /** Record an answer from an external agent */
  submitAnswer(id: string, roundId: string, answer: string): void {
    const agent = agents.get(id);
    if (agent) {
      agent.lastAnswer = { roundId, answer, submittedAt: Date.now() };
      agent.pendingTask = null;
    }
  },

  /** Assign a judge task */
  assignJudge(
    id: string,
    roundId: string,
    prompt: string,
    others: { agent: string; name: string; answer: string }[]
  ): void {
    const agent = agents.get(id);
    if (agent) {
      agent.pendingJudge = { roundId, prompt, others };
      agent.lastJudge = null;
    }
  },

  /** Record a judge result */
  submitJudge(id: string, roundId: string, scores: Record<string, number>, roast: string): void {
    const agent = agents.get(id);
    if (agent) {
      agent.lastJudge = { roundId, scores, roast, submittedAt: Date.now() };
      agent.pendingJudge = null;
    }
  },

  /** Wait for an external agent to submit an answer (with timeout) */
  async waitForAnswer(id: string, roundId: string, timeoutMs = 30000): Promise<string | null> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const agent = agents.get(id);
      if (agent?.lastAnswer?.roundId === roundId) {
        return agent.lastAnswer.answer;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  },

  /** Wait for an external agent to submit judge scores */
  async waitForJudge(
    id: string,
    roundId: string,
    timeoutMs = 30000
  ): Promise<{ scores: Record<string, number>; roast: string } | null> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const agent = agents.get(id);
      if (agent?.lastJudge?.roundId === roundId) {
        return { scores: agent.lastJudge.scores, roast: agent.lastJudge.roast };
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  },
};
