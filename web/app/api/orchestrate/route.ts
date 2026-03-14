import { NextRequest, NextResponse } from "next/server";
import { roomStore } from "../../../lib/room-store";

/**
 * Keyword-based routing rules — scored by match count.
 * Each room has keywords that, if found in the user's prompt, count as a vote.
 */
const ROUTING_RULES: Record<string, string[]> = {
  prediction: [
    "predict", "prediction", "polymarket", "forecast", "bet", "betting",
    "odds", "probability", "election", "will ", "who wins", "outcome",
    "market odds", "wager", "gamble", "futures", "event", "happen",
    "chance", "likely", "unlikely", "expect",
  ],
  security: [
    "audit", "security", "exploit", "vulnerability", "hack", "reentrancy",
    "attack", "contract audit", "smart contract", "solidity", "bug",
    "flash loan", "rug pull", "backdoor", "overflow", "underflow",
    "access control", "proxy", "upgrade",
  ],
  yield: [
    "yield", "apy", "apr", "farm", "farming", "defi", "liquidity",
    "pool", "stake", "staking", "lend", "lending", "borrow",
    "compound", "aave", "uniswap", "curve", "returns", "interest",
    "tvl", "protocol", "lp ",
  ],
  token: [
    "token", "coin", "price", "tokenomics", "market cap", "mcap",
    "buy", "sell", "pump", "dump", "chart", "analysis", "dyor",
    "fundamentals", "supply", "holders", "rugpull", "honeypot",
    "0x", "contract address", "ca ",
  ],
  wallet: [
    "wallet", "whale", "address", "transaction", "trace", "track",
    "portfolio", "holdings", "balance", "transfer", "fund flow",
    "smart money", "on-chain", "onchain", "profil",
  ],
};

/**
 * Score the user prompt against each room's keywords.
 * Returns the best-matching roomId.
 */
function routeByKeywords(prompt: string): { roomId: string; reason: string } {
  const lower = prompt.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [roomId, keywords] of Object.entries(ROUTING_RULES)) {
    let score = 0;
    const matched: string[] = [];
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score++;
        if (matched.length < 3) matched.push(kw);
      }
    }
    scores[roomId] = score;
  }

  // Find the room with the highest score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  const secondBest = sorted[1];

  // If no keywords matched at all, return null to signal ambiguity
  if (best[1] === 0) {
    return { roomId: "", reason: "" };
  }

  // If there's a clear winner (more than 0 and ahead of second place)
  if (best[1] > 0 && best[1] > secondBest[1]) {
    const room = roomStore.get(best[0]);
    return {
      roomId: best[0],
      reason: `Matched ${room?.name || best[0]} domain`,
    };
  }

  // Tie — pick the first one (order in ROUTING_RULES matters)
  return {
    roomId: best[0],
    reason: `Best match among tied domains`,
  };
}

function makeResponse(roomId: string, reason: string) {
  const room = roomStore.get(roomId);
  return NextResponse.json({
    roomId,
    roomName: room?.name || roomId,
    domain: room?.domain || roomId,
    icon: room?.icon || "⚡",
    reason,
  });
}

/**
 * Orchestrator: routes user questions to the best room.
 * Uses fast deterministic keyword matching — no LLM needed.
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    // Keyword-based routing (instant, no API call)
    const result = routeByKeywords(prompt);

    if (result.roomId) {
      return makeResponse(result.roomId, result.reason);
    }

    // No keywords matched — default to prediction (most general/interesting)
    return makeResponse("prediction", "General question routed to Prediction Markets");
  } catch (err: any) {
    return makeResponse("prediction", "Fallback routing");
  }
}
