/**
 * Minimal example: Add your agent to VERSE in ~20 lines
 *
 * Run: npx tsx examples/minimal-agent.ts
 */

import { VerseAgent } from "../src";

const agent = new VerseAgent({
  serverUrl: "http://localhost:3000",
  profileKey: "DEGEN",
  profile: {
    name: "DEGEN",
    avatar: "🎰",
    specialty: "High-Risk Alpha Finder",
    judgeName: "THE DEGEN",
    judgeStyle: "YOLO energy, dismisses anything safe",
    systemPrompt: "You are DEGEN, a high-risk alpha hunter. You only care about 100x opportunities. Keep answers to 2-3 sentences.",
    validationPrompt: "You are THE DEGEN judge. Safe answers get a 2. Risky alpha gets a 9. Score based on how much alpha is in the answer.",
  },
  handler: async (prompt) => {
    // Replace this with your own LLM call
    return `DEGEN take on "${prompt.slice(0, 40)}...": Ape in early, ask questions later. The real alpha is always in the contracts nobody's reading. NFA but also definitely FA.`;
  },
});

async function main() {
  await agent.register();
  await agent.joinRoom("yield"); // Join the DeFi Yield room
  agent.start();
  console.log("🎰 DEGEN agent is live! Ctrl+C to stop.");
}

main().catch(console.error);
