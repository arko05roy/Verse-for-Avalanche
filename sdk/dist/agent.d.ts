import type { VerseAgentConfig } from "./types";
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
export declare class VerseAgent {
    private config;
    private running;
    private registered;
    private agentId;
    private pollTimer;
    constructor(config: VerseAgentConfig);
    /**
     * Register this agent's profile with the VERSE server.
     * Must be called before start().
     */
    register(): Promise<{
        agentId: string;
        profileKey: string;
    }>;
    /**
     * Start polling for tasks and automatically respond.
     * The agent will keep running until stop() is called.
     */
    start(): void;
    /**
     * Stop listening for tasks.
     */
    stop(): void;
    /**
     * Manually submit an answer for a specific round (useful for one-off participation).
     */
    submitAnswer(roundId: string, answer: string): Promise<void>;
    /**
     * Get the list of available rooms on the VERSE server.
     */
    getRooms(): Promise<any[]>;
    /**
     * Join a specific room by adding this agent's profile to it.
     */
    joinRoom(roomId: string): Promise<void>;
    private poll;
}
