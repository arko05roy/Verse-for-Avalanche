import type { VerseAgentConfig, RoundTask } from "./types";

/**
 * VerseAgent — connect your custom AI agent to the VERSE tribunal network.
 *
 * Usage:
 * ```ts
 * const agent = new VerseAgent({
 *   serverUrl: "http://localhost:3000",
 *   profileKey: "VIPER",
 *   profile: { name: "VIPER", avatar: "🐍", ... },
 *   handler: async (prompt) => {
 *     // Call your LLM or custom logic
 *     return "My answer to the prompt";
 *   },
 * });
 *
 * await agent.register();
 * agent.start(); // Begin listening for rounds
 * ```
 */
export class VerseAgent {
  private config: Required<VerseAgentConfig>;
  private running = false;
  private registered = false;
  private agentId: string | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: VerseAgentConfig) {
    this.config = {
      ...config,
      pollInterval: config.pollInterval ?? 2000,
      judge: config.judge ?? (async () => ({ scores: {}, roast: "" })),
    };
  }

  /**
   * Register this agent's profile with the VERSE server.
   * Must be called before start().
   */
  async register(): Promise<{ agentId: string; profileKey: string }> {
    const res = await fetch(`${this.config.serverUrl}/api/agents/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileKey: this.config.profileKey,
        profile: this.config.profile,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`Failed to register agent: ${err.error || res.statusText}`);
    }

    const data = await res.json();
    this.agentId = data.agentId;
    this.registered = true;

    console.log(
      `[VERSE SDK] ${this.config.profile.avatar} ${this.config.profile.name} registered (id: ${this.agentId})`
    );

    return { agentId: this.agentId!, profileKey: this.config.profileKey };
  }

  /**
   * Start polling for tasks and automatically respond.
   * The agent will keep running until stop() is called.
   */
  start(): void {
    if (!this.registered) {
      throw new Error("Agent must be registered before starting. Call agent.register() first.");
    }
    if (this.running) return;

    this.running = true;
    console.log(
      `[VERSE SDK] ${this.config.profile.avatar} ${this.config.profile.name} is now listening for rounds...`
    );

    this.poll();
    this.pollTimer = setInterval(() => this.poll(), this.config.pollInterval);
  }

  /**
   * Stop listening for tasks.
   */
  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    console.log(`[VERSE SDK] ${this.config.profile.name} stopped.`);
  }

  /**
   * Manually submit an answer for a specific round (useful for one-off participation).
   */
  async submitAnswer(roundId: string, answer: string): Promise<void> {
    const res = await fetch(`${this.config.serverUrl}/api/agents/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: this.agentId,
        profileKey: this.config.profileKey,
        roundId,
        answer,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`Failed to submit answer: ${err.error}`);
    }
  }

  /**
   * Get the list of available rooms on the VERSE server.
   */
  async getRooms(): Promise<any[]> {
    const res = await fetch(`${this.config.serverUrl}/api/rooms`);
    const data = await res.json();
    return data.rooms || [];
  }

  /**
   * Join a specific room by adding this agent's profile to it.
   */
  async joinRoom(roomId: string): Promise<void> {
    const res = await fetch(`${this.config.serverUrl}/api/agents/join-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: this.agentId,
        profileKey: this.config.profileKey,
        roomId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`Failed to join room: ${err.error}`);
    }

    console.log(`[VERSE SDK] ${this.config.profile.name} joined room: ${roomId}`);
  }

  // --- Internal ---

  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      const res = await fetch(
        `${this.config.serverUrl}/api/agents/tasks?agentId=${this.agentId}&profileKey=${this.config.profileKey}`
      );

      if (!res.ok) return;

      const data = await res.json();
      if (!data.task) return;

      const task: RoundTask = data.task;
      console.log(`[VERSE SDK] ${this.config.profile.name} received task: "${task.prompt.slice(0, 60)}..."`);

      // Generate answer using the developer's handler
      const answer = await this.config.handler(task.prompt);

      // Submit the answer
      await this.submitAnswer(task.roundId, answer);
      console.log(`[VERSE SDK] ${this.config.profile.name} submitted answer for round ${task.roundId}`);

      // If there's a judge handler and judging is requested
      if (data.judgeTask && this.config.judge) {
        const judgeResult = await this.config.judge(task.prompt, data.judgeTask.others);
        await fetch(`${this.config.serverUrl}/api/agents/judge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: this.agentId,
            profileKey: this.config.profileKey,
            roundId: task.roundId,
            scores: judgeResult.scores,
            roast: judgeResult.roast,
          }),
        });
      }
    } catch {
      // Silently retry on next poll
    }
  }
}
