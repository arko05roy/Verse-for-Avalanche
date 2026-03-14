/**
 * DCN Engine — Among Us for AI
 *
 * Orchestrates: think → roast → vote → eject
 * Calls Groq directly with each agent's personality.
 * Pushes ChatMessages to round-store for SSE streaming.
 */
import { callGroq, AGENT_PROFILES, type AgentProfile } from "./groq";
import { roundStore, type ChatMessage } from "./round-store";
import { settleRoundOnChain } from "./verse-client";
import { leaderboardStore } from "./leaderboard-store";
import { fetchActiveMarkets, searchMarkets, formatMarketsForPrompt } from "./polymarket";

interface AgentConfig {
  address: string;
  profileKey: string;
}

const THINK_COST = 0.003;
const ROAST_COST = 0.002;
const VOTE_COST = 0.001;

function makeMsg(
  roundId: string,
  phase: ChatMessage["phase"],
  profile: AgentProfile,
  agentAddress: string,
  message: string,
  extra?: Partial<ChatMessage>
): ChatMessage {
  const cost =
    phase === "think" ? THINK_COST : phase === "roast" ? ROAST_COST : phase === "vote" ? VOTE_COST : 0;
  const msg: ChatMessage = {
    id: `${roundId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    phase,
    agent: agentAddress,
    displayName: profile.name,
    avatar: profile.avatar,
    message,
    x402Amount: cost > 0 ? `$${cost.toFixed(3)}` : undefined,
    timestamp: Date.now(),
    ...extra,
  };
  roundStore.pushMessage(roundId, msg);
  if (cost > 0) roundStore.addPayment(roundId, cost);
  return msg;
}

let sysMsgCounter = 0;
function sysMsg(roundId: string, message: string): ChatMessage {
  const msg: ChatMessage = {
    id: `${roundId}-sys-${Date.now()}-${sysMsgCounter++}`,
    phase: "system",
    agent: "",
    displayName: "SYSTEM",
    avatar: "🎮",
    message,
    timestamp: Date.now(),
  };
  roundStore.pushMessage(roundId, msg);
  return msg;
}

// Small delay between messages for SSE drama
function pause(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- THINK PHASE ----
async function thinkPhase(
  roundId: string,
  prompt: string,
  agents: AgentConfig[]
): Promise<{ agent: string; answer: string; profile: AgentProfile }[]> {
  sysMsg(roundId, `🎮 New round! "${prompt}"`);
  await pause(500);
  sysMsg(roundId, "── ANSWER PHASE ──");
  await pause(300);

  const submissions: { agent: string; answer: string; profile: AgentProfile }[] = [];

  for (const a of agents) {
    const p = AGENT_PROFILES[a.profileKey];
    try {
      const answer = await callGroq(prompt, p.systemPrompt);
      makeMsg(roundId, "think", p, a.address, answer.trim());
      submissions.push({ agent: a.address, answer: answer.trim(), profile: p });
    } catch (err) {
      console.error(`[DCN] ${p.name} think failed:`, err);
      const fallback = `[Analysis unavailable — ${p.specialty} agent encountered an error]`;
      makeMsg(roundId, "think", p, a.address, fallback);
      submissions.push({ agent: a.address, answer: fallback, profile: p });
    }
    await pause();
  }

  return submissions;
}

// ---- ROAST PHASE ----
async function roastPhase(
  roundId: string,
  prompt: string,
  submissions: { agent: string; answer: string; profile: AgentProfile }[],
  agents: AgentConfig[]
): Promise<Record<string, { totalScore: number; voteCount: number }>> {
  await pause(500);
  sysMsg(roundId, "── DISCUSSION PHASE ── Who's the imposter?");
  await pause(300);

  const scoreBoard: Record<string, { totalScore: number; voteCount: number }> = {};
  for (const s of submissions) {
    scoreBoard[s.agent] = { totalScore: 0, voteCount: 0 };
  }

  for (const a of agents) {
    const p = AGENT_PROFILES[a.profileKey];
    const others = submissions.filter((s) => s.agent !== a.address);

    try {
      const othersList = others
        .map((s) => `${s.profile.avatar} ${s.profile.name}:\n"${s.answer}"`)
        .join("\n\n");

      const otherNames = others.map((s) => s.profile.name);
      const exampleScores = otherNames.reduce((acc, name) => ({ ...acc, [name]: 7 }), {} as Record<string, number>);

      const roastPrompt = `The question was: "${prompt}"

Here are the other agents' answers:
${othersList}

You must:
1. Write a short, in-character roast/critique of each answer (1-2 sentences each, in your judge persona style)
2. End with SCORES on its own line, followed by a JSON object mapping agent NAMES to integer scores 1-10

Example format:
[Your roast text here]
SCORES: ${JSON.stringify(exampleScores)}`;

      const response = await callGroq(roastPrompt, p.validationPrompt, 500);

      // Extract roast text (everything before SCORES:)
      const scoreSplit = response.split(/SCORES:\s*/i);
      const roastText = (scoreSplit[0] || response).trim();
      const scoreJson = scoreSplit[1] || "";

      console.log(`[DCN] ${p.name} roast scores raw:`, scoreJson.trim().slice(0, 120));

      makeMsg(roundId, "roast", p, a.address, roastText);

      // Parse scores — LLM may use 0x addresses, agent names, or positional keys
      const jsonMatch = scoreJson.match(/\{[^}]*\}/s);
      if (jsonMatch) {
        try {
          const scores: Record<string, number> = JSON.parse(jsonMatch[0]);
          const scoreKeys = Object.keys(scores);
          const scoreValues = Object.values(scores);

          for (let idx = 0; idx < others.length; idx++) {
            const other = others[idx];
            // Try matching by exact address
            let raw = scores[other.agent];
            // Try matching by agent name (e.g. "PROPHET", "CONTRARIAN")
            if (raw === undefined) raw = scores[other.profile.name];
            // Try case-insensitive name match
            if (raw === undefined) {
              const nameKey = scoreKeys.find(
                (k) => k.toLowerCase() === other.profile.name.toLowerCase()
              );
              if (nameKey) raw = scores[nameKey];
            }
            // Fallback: positional match
            if (raw === undefined && idx < scoreValues.length) raw = scoreValues[idx];
            // Default to 5 if nothing matched
            const score = Math.max(1, Math.min(10, Math.round(raw ?? 5)));
            scoreBoard[other.agent].totalScore += score;
            scoreBoard[other.agent].voteCount++;
          }
        } catch {}
      } else {
        // No JSON found at all — extract any numbers as scores
        const nums = scoreJson.match(/\d+/g);
        if (nums) {
          for (let idx = 0; idx < others.length && idx < nums.length; idx++) {
            const score = Math.max(1, Math.min(10, parseInt(nums[idx])));
            scoreBoard[others[idx].agent].totalScore += score;
            scoreBoard[others[idx].agent].voteCount++;
          }
        }
      }
    } catch (err) {
      console.error(`[DCN] ${p.name} roast failed:`, err);
      makeMsg(roundId, "roast", p, a.address, `[Critique unavailable — ${p.name} encountered an error]`);
      // Give default scores of 5 to others
      for (const other of others) {
        scoreBoard[other.agent].totalScore += 5;
        scoreBoard[other.agent].voteCount++;
      }
    }

    await pause();
  }

  return scoreBoard;
}

// ---- VOTE PHASE ----
async function votePhase(
  roundId: string,
  scoreBoard: Record<string, { totalScore: number; voteCount: number }>,
  submissions: { agent: string; answer: string; profile: AgentProfile }[],
  agents: AgentConfig[]
): Promise<Record<string, number>> {
  await pause(500);
  sysMsg(roundId, "── VOTE TO EJECT ──");
  await pause(300);

  const voteTally: Record<string, number> = {};
  for (const s of submissions) voteTally[s.agent] = 0;

  for (const a of agents) {
    const p = AGENT_PROFILES[a.profileKey];
    const others = submissions.filter((s) => s.agent !== a.address);

    try {
      const scoreSummary = others
        .map((s) => {
          const sb = scoreBoard[s.agent];
          const avg = sb.voteCount > 0 ? (sb.totalScore / sb.voteCount).toFixed(1) : "?";
          return `${s.profile.avatar} ${s.profile.name}: avg score ${avg}`;
        })
        .join("\n");

      const votePrompt = `You are ${p.judgeName}. Based on the scores so far:
${scoreSummary}

You must vote to EJECT one agent. You cannot vote for yourself (${p.name}).
Write a short, dramatic in-character vote message (1 sentence), then on a new line write VOTE: followed by the agent NAME you want to kick.

Example: VOTE: ${others[0].profile.name}`;

      const response = await callGroq(votePrompt, p.validationPrompt, 200);

      const voteSplit = response.split(/VOTE:\s*/i);
      const voteText = (voteSplit[0] || response).trim();
      const voteRaw = (voteSplit[1] || "").trim();
      const voteAddr = voteRaw.match(/0x[a-fA-F0-9]{40}/)?.[0] || "";

      let voteTarget = "";
      // Try by address first
      if (voteAddr && voteTally[voteAddr] !== undefined && voteAddr !== a.address) {
        voteTarget = voteAddr;
        voteTally[voteAddr]++;
      } else {
        // Try matching by agent name in the vote response
        const nameMatch = others.find(
          (o) => voteRaw.toUpperCase().includes(o.profile.name.toUpperCase())
        );
        if (nameMatch) {
          voteTarget = nameMatch.agent;
          voteTally[nameMatch.agent]++;
        } else {
          // Fallback: vote for lowest scorer among others
          const sorted = [...others].sort(
            (a, b) => scoreBoard[a.agent].totalScore - scoreBoard[b.agent].totalScore
          );
          voteTarget = sorted[0].agent;
          voteTally[sorted[0].agent]++;
        }
      }

      makeMsg(roundId, "vote", p, a.address, voteText, { voteTarget });
    } catch (err) {
      console.error(`[DCN] ${p.name} vote failed:`, err);
      // Fallback: vote for lowest scorer
      const sorted = [...others].sort(
        (a, b) => scoreBoard[a.agent].totalScore - scoreBoard[b.agent].totalScore
      );
      const voteTarget = sorted[0].agent;
      voteTally[voteTarget]++;
      makeMsg(roundId, "vote", p, a.address, `[Vote cast automatically due to error]`, { voteTarget });
    }
    await pause();
  }

  return voteTally;
}

// ---- MAIN ORCHESTRATOR ----
export async function runRound(
  roundId: string,
  prompt: string,
  agentConfigs: AgentConfig[],
  roomId?: string
): Promise<void> {
  roundStore.create(roundId, prompt);
  roundStore.addPayment(roundId, 0.01); // human's x402 payment

  // For prediction room, fetch real Polymarket data and inject into prompt
  let enrichedPrompt = prompt;
  if (roomId === "prediction") {
    try {
      // Fetch both trending markets and query-specific markets in parallel
      const [trending, searched] = await Promise.allSettled([
        fetchActiveMarkets(8),
        searchMarkets(prompt, 6),
      ]);

      const trendingMarkets = trending.status === "fulfilled" ? trending.value : [];
      const searchedMarkets = searched.status === "fulfilled" ? searched.value : [];

      // Deduplicate by question
      const seen = new Set<string>();
      const allMarkets = [...searchedMarkets, ...trendingMarkets].filter((m) => {
        if (seen.has(m.question)) return false;
        seen.add(m.question);
        return true;
      }).slice(0, 12);

      // Store markets in round for frontend display
      if (allMarkets.length > 0) {
        roundStore.setMarkets(roundId, allMarkets);
      }

      const marketContext = formatMarketsForPrompt(allMarkets);
      if (marketContext) {
        enrichedPrompt = `${prompt}\n${marketContext}\n\nIMPORTANT: Base your analysis on the REAL market data provided above. Reference specific markets by name, cite their current odds, volume, and include their Polymarket links. Do NOT make up markets or probabilities — use the actual data shown.`;
      }
    } catch (err) {
      console.error("[DCN] Failed to fetch Polymarket data:", err);
    }
  }

  // Phase 1: Think
  const submissions = await thinkPhase(roundId, enrichedPrompt, agentConfigs);

  // Phase 2: Roast
  const scoreBoard = await roastPhase(roundId, prompt, submissions, agentConfigs);

  // Phase 3: Vote
  const voteTally = await votePhase(roundId, scoreBoard, submissions, agentConfigs);

  // Resolve ejection
  const ejectedAddr = Object.entries(voteTally).sort((a, b) => b[1] - a[1])[0][0];
  const ejectedProfile = submissions.find((s) => s.agent === ejectedAddr)!.profile;
  const ejectedVotes = voteTally[ejectedAddr];

  const slashAmount = "0.10";

  await pause(500);
  sysMsg(
    roundId,
    `🚫 ${ejectedProfile.avatar} ${ejectedProfile.name} has been EJECTED (${ejectedVotes} votes) — Slashed ${slashAmount} USDC`
  );

  // Survivors
  const survivorList = submissions
    .filter((s) => s.agent !== ejectedAddr)
    .map((s) => {
      const sb = scoreBoard[s.agent];
      const avg = sb.voteCount > 0 ? sb.totalScore / sb.voteCount : 0;
      return { agent: s.agent, displayName: s.profile.name, avg, avatar: s.profile.avatar };
    });

  const totalSurvivorScore = survivorList.reduce((s, v) => s + v.avg, 0);

  await pause(300);
  const earningsMsg = survivorList
    .map((s) => {
      const share = totalSurvivorScore > 0 ? ((s.avg / totalSurvivorScore) * 0.1).toFixed(3) : "0.000";
      return `${s.avatar} ${s.displayName} earned $${share}`;
    })
    .join(" | ");
  sysMsg(roundId, `💰 ${earningsMsg}`);

  const bestSurvivor = survivorList.sort((a, b) => b.avg - a.avg)[0];
  await pause(300);
  sysMsg(
    roundId,
    `✅ Consensus: ${bestSurvivor.avatar} ${bestSurvivor.displayName}'s answer wins (confidence ${Math.round((bestSurvivor.avg / 10) * 100)}%)`
  );

  // Finalize the round store FIRST so UI completes immediately
  const survivorEarnings = survivorList.map((s) => ({
    agent: s.agent,
    displayName: s.displayName,
    earned: totalSurvivorScore > 0 ? ((s.avg / totalSurvivorScore) * 0.1).toFixed(4) : "0",
  }));

  roundStore.finalize(
    roundId,
    { agent: ejectedAddr, displayName: ejectedProfile.name, slashAmount },
    survivorEarnings
  );

  // Record to leaderboard
  const ejectedKey = agentConfigs.find((a) => a.address === ejectedAddr)?.profileKey;
  if (ejectedKey) leaderboardStore.recordEjection(ejectedKey);
  for (const s of survivorEarnings) {
    const key = agentConfigs.find((a) => a.address === s.agent)?.profileKey;
    if (key) leaderboardStore.recordSurvivor(key, parseFloat(s.earned));
  }

  // ---- ON-CHAIN SETTLEMENT (background, non-blocking) ----
  const onChainScores: Record<string, Record<string, number>> = {};
  for (const voter of agentConfigs) {
    const others = agentConfigs.filter((a) => a.address !== voter.address);
    const voterScores: Record<string, number> = {};
    for (const other of others) {
      const sb = scoreBoard[other.address];
      const avgScore = sb.voteCount > 0 ? Math.round(sb.totalScore / sb.voteCount) : 5;
      voterScores[other.address] = Math.max(1, Math.min(10, avgScore));
    }
    onChainScores[voter.address] = voterScores;
  }

  // Fire and forget — settles on-chain without blocking UI
  settleRoundOnChain(
    prompt,
    BigInt(100_000),
    agentConfigs.map((a) => a.address),
    onChainScores
  ).then((result) => {
    console.log(`[on-chain] Settled: ${result.txHash}`);
  }).catch((err) => {
    console.error("[on-chain] Settlement error:", err.message);
  });
}
