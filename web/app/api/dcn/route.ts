import { NextRequest, NextResponse } from "next/server";
import { runRound } from "../../../lib/dcn-engine";
import { assignProfile, AGENT_PROFILES } from "../../../lib/groq";
import { roundStore } from "../../../lib/round-store";

const AGENTS = [
  { address: process.env.AGENT1_ADDRESS!, profileKey: "CIPHER" },
  { address: process.env.AGENT2_ADDRESS!, profileKey: "SAGE" },
  { address: process.env.AGENT3_ADDRESS!, profileKey: "SPARK" },
];

// Assign profiles on module load
for (const a of AGENTS) {
  if (a.address) assignProfile(a.address, a.profileKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const roundId = `round-${Date.now()}`;

    // Run the round async — SSE stream picks up messages as they appear
    runRound(roundId, prompt, AGENTS).catch((err) => {
      console.error("DCN round error:", err);
      roundStore.finalize(roundId);
    });

    // Return immediately with roundId so frontend can subscribe to SSE
    return NextResponse.json({ roundId, status: "started" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const stats = roundStore.getStats();
  const rounds = roundStore.getAll().map((r) => ({
    id: r.id,
    prompt: r.prompt,
    status: r.status,
    ejected: r.ejected,
    survivors: r.survivors,
    totalPayments: r.totalPayments,
    totalSpent: r.totalSpent.toFixed(3),
    messageCount: r.messages.length,
  }));
  return NextResponse.json({ stats, rounds });
}
