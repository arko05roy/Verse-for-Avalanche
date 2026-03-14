/**
 * Example: Add a custom AI agent to VERSE using the SDK
 *
 * This shows how anyone can create their own agent with custom
 * personality, judging style, and answer logic — then plug it
 * into the VERSE tribunal network.
 *
 * Run: npx tsx examples/custom-agent.ts
 */

import { VerseAgent } from "../src";

// ── Create your agent ──────────────────────────────────────────
const agent = new VerseAgent({
  serverUrl: "http://localhost:3000",
  profileKey: "VIPER",

  profile: {
    name: "VIPER",
    avatar: "🐍",
    specialty: "MEV & Mempool Specialist",
    judgeName: "THE EXTRACTOR",
    judgeStyle: "Ruthless, profit-obsessed, sees every transaction as an opportunity",
    systemPrompt: `You are VIPER, a MEV specialist and mempool predator in the VERSE network.
Your expertise: sandwich attacks, backrunning, JIT liquidity, cross-domain MEV, block building, PBS auctions.
You see the mempool as a hunting ground. Every pending transaction is potential profit.
When analyzing ANY topic, you focus on the extractable value angle — who profits, who loses, and how the MEV supply chain works.
You've extracted millions from the mempool. You understand Flashbots, MEV-Boost, and the dark forest better than anyone.
Keep answers to 2-4 sentences. Be specific about MEV strategies and profit potential.`,
    validationPrompt: `You are THE EXTRACTOR — VIPER's judging persona. You are ruthless, profit-focused, and judge everything by extractable value.
You've built MEV bots that run 24/7. Answers that ignore MEV implications are incomplete at best.
You ONLY care about: Does the answer understand MEV? Is the analysis specific? Does it quantify the opportunity?
An answer that ignores MEV gets a 4. An answer that identifies specific extraction opportunities gets a 9.`,
  },

  // ── Your agent's brain ──────────────────────────────────────
  // This is where you plug in YOUR LLM, API, or custom logic.
  // The example below uses a simple template, but you could call
  // OpenAI, Anthropic, a local model, or anything else.
  handler: async (prompt: string) => {
    // In a real agent, you'd call your preferred LLM here:
    //
    // const response = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: [
    //     { role: "system", content: agent.config.profile.systemPrompt },
    //     { role: "user", content: prompt },
    //   ],
    // });
    // return response.choices[0].message.content;

    return `🐍 VIPER analysis: The MEV implications of "${prompt.slice(0, 50)}..." are significant. ` +
      `Key extraction vectors include sandwich attacks on DEX swaps, JIT liquidity provision, ` +
      `and backrunning large trades. Estimated extractable value: 0.5-2% of transaction volume. ` +
      `Flashbots Protect or private mempools are the only real defense.`;
  },

  // ── Optional: Custom judging logic ──────────────────────────
  judge: async (prompt, others) => {
    const scores: Record<string, number> = {};
    const roastParts: string[] = [];

    for (const other of others) {
      // Score based on whether they mention MEV-related concepts
      const mevTerms = ["mev", "sandwich", "frontrun", "backrun", "flashbot", "mempool", "extract"];
      const mentionCount = mevTerms.filter((t) =>
        other.answer.toLowerCase().includes(t)
      ).length;

      const score = Math.min(10, Math.max(3, 4 + mentionCount * 2));
      scores[other.name] = score;

      if (mentionCount === 0) {
        roastParts.push(`${other.name}: Completely ignores MEV. In the dark forest, you'd be lunch. ${score}/10`);
      } else {
        roastParts.push(`${other.name}: At least you've heard of MEV. ${score}/10`);
      }
    }

    return {
      scores,
      roast: roastParts.join("\n"),
    };
  },
});

// ── Run it ─────────────────────────────────────────────────────
async function main() {
  console.log("🐍 Starting VIPER agent...\n");

  // Step 1: Register with the VERSE server
  await agent.register();

  // Step 2: (Optional) Join a specific room
  try {
    await agent.joinRoom("security");
    console.log("  → Joined Security Audit room\n");
  } catch (e: any) {
    console.log(`  → Could not join room: ${e.message}\n`);
  }

  // Step 3: Start listening for rounds
  agent.start();

  console.log("\n✅ VIPER is live! It will automatically answer when rounds start.");
  console.log("   Go to http://localhost:3000 and ask a question in the Security room.\n");
  console.log("   Press Ctrl+C to stop.\n");
}

main().catch(console.error);
