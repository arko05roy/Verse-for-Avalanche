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

function sysMsg(roundId: string, message: string): ChatMessage {
  const msg: ChatMessage = {
    id: `${roundId}-sys-${Date.now()}`,
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
    const answer = await callGroq(prompt, p.systemPrompt);
    makeMsg(roundId, "think", p, a.address, answer.trim());
    submissions.push({ agent: a.address, answer: answer.trim(), profile: p });
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
    const othersList = others
      .map((s) => `${s.profile.avatar} ${s.profile.name} (${s.agent}):\n"${s.answer}"`)
      .join("\n\n");

    const roastPrompt = `The question was: "${prompt}"

Here are the other agents' answers:
${othersList}

You must:
1. Write a short, in-character roast/critique of each answer (1-2 sentences each, in your judge persona style)
2. End with SCORES on its own line, followed by a JSON object mapping their 0x addresses to integer scores 1-10

Example format:
[Your roast text here]
SCORES: {"0xabc": 7, "0xdef": 3}`;

    const response = await callGroq(roastPrompt, p.validationPrompt);

    // Extract roast text (everything before SCORES:)
    const scoreSplit = response.split(/SCORES:\s*/i);
    const roastText = (scoreSplit[0] || response).trim();
    const scoreJson = scoreSplit[1] || "";

    makeMsg(roundId, "roast", p, a.address, roastText);

    // Parse scores
    const jsonMatch = scoreJson.match(/\{[^}]+\}/);
    if (jsonMatch) {
      try {
        const scores: Record<string, number> = JSON.parse(jsonMatch[0]);
        for (const other of others) {
          const raw = scores[other.agent] || scores[Object.keys(scores)[others.indexOf(other)]];
          const score = Math.max(1, Math.min(10, Math.round(raw || 5)));
          scoreBoard[other.agent].totalScore += score;
          scoreBoard[other.agent].voteCount++;
        }
      } catch {}
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
    const scoreSummary = others
      .map((s) => {
        const sb = scoreBoard[s.agent];
        const avg = sb.voteCount > 0 ? (sb.totalScore / sb.voteCount).toFixed(1) : "?";
        return `${s.profile.avatar} ${s.profile.name} (${s.agent}): avg score ${avg}`;
      })
      .join("\n");

    const votePrompt = `You are ${p.judgeName}. Based on the scores so far:
${scoreSummary}

You must vote to EJECT one agent. You cannot vote for yourself (${a.address}).
Write a short, dramatic in-character vote message (1 sentence), then on a new line write VOTE: followed by the 0x address you want to kick.`;

    const response = await callGroq(votePrompt, p.validationPrompt);

    const voteSplit = response.split(/VOTE:\s*/i);
    const voteText = (voteSplit[0] || response).trim();
    const voteAddr = (voteSplit[1] || "").trim().match(/0x[a-fA-F0-9]{40}/)?.[0] || "";

    let voteTarget = "";
    if (voteAddr && voteTally[voteAddr] !== undefined && voteAddr !== a.address) {
      voteTarget = voteAddr;
      voteTally[voteAddr]++;
    } else {
      // Fallback: vote for lowest scorer among others
      const lowest = others.sort(
        (a, b) => scoreBoard[a.agent].totalScore - scoreBoard[b.agent].totalScore
      )[0];
      voteTarget = lowest.agent;
      voteTally[lowest.agent]++;
    }

    makeMsg(roundId, "vote", p, a.address, voteText, { voteTarget });
    await pause();
  }

  return voteTally;
}

// ---- MAIN ORCHESTRATOR ----
export async function runRound(
  roundId: string,
  prompt: string,
  agentConfigs: AgentConfig[]
): Promise<void> {
  roundStore.create(roundId, prompt);
  roundStore.addPayment(roundId, 0.01); // human's x402 payment

  // Phase 1: Think
  const submissions = await thinkPhase(roundId, prompt, agentConfigs);

  // Phase 2: Roast
  const scoreBoard = await roastPhase(roundId, prompt, submissions, agentConfigs);

  // Phase 3: Vote
  const voteTally = await votePhase(roundId, scoreBoard, submissions, agentConfigs);

  // Resolve ejection
  const ejectedAddr = Object.entries(voteTally).sort((a, b) => b[1] - a[1])[0][0];
  const ejectedProfile = submissions.find((s) => s.agent === ejectedAddr)!.profile;
  const ejectedVotes = voteTally[ejectedAddr];

  // ---- ON-CHAIN SETTLEMENT ----
  // Build scores map: voter -> { candidate -> score }
  // We need to reconstruct per-voter scores from the scoreBoard
  // Each voter scored the others during roast phase
  const onChainScores: Record<string, Record<string, number>> = {};
  for (const voter of agentConfigs) {
    const others = agentConfigs.filter((a) => a.address !== voter.address);
    const voterScores: Record<string, number> = {};
    for (const other of others) {
      const sb = scoreBoard[other.address];
      // Use average score as the voter's score (approximation since we aggregate)
      const avgScore = sb.voteCount > 0 ? Math.round(sb.totalScore / sb.voteCount) : 5;
      voterScores[other.address] = Math.max(1, Math.min(10, avgScore));
    }
    onChainScores[voter.address] = voterScores;
  }

  const BOUNTY = BigInt(100_000); // 0.1 USDC
  let txHash = "";

  await pause(500);
  sysMsg(roundId, "⛓️ Settling on-chain...");

  try {
    const result = await settleRoundOnChain(
      prompt,
      BOUNTY,
      agentConfigs.map((a) => a.address),
      onChainScores
    );
    txHash = result.txHash;
    sysMsg(roundId, `⛓️ On-chain tx: ${txHash.slice(0, 14)}...`);
  } catch (err: any) {
    console.error("[on-chain] Settlement error:", err.message);
    sysMsg(roundId, `⚠️ On-chain settlement failed: ${err.message?.slice(0, 60)}`);
  }

  const slashAmount = "0.10";

  await pause(300);
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

  // Best answer
  const bestSurvivor = survivorList.sort((a, b) => b.avg - a.avg)[0];
  await pause(300);
  sysMsg(
    roundId,
    `✅ Consensus: ${bestSurvivor.avatar} ${bestSurvivor.displayName}'s answer wins (confidence ${Math.round((bestSurvivor.avg / 10) * 100)}%)`
  );

  if (txHash) {
    sysMsg(roundId, `🔗 https://testnet.snowtrace.io/tx/${txHash}`);
  }

  roundStore.finalize(
    roundId,
    { agent: ejectedAddr, displayName: ejectedProfile.name, slashAmount },
    survivorList.map((s) => ({
      agent: s.agent,
      displayName: s.displayName,
      earned: totalSurvivorScore > 0 ? ((s.avg / totalSurvivorScore) * 0.1).toFixed(4) : "0",
    })),
    txHash || undefined
  );
}
