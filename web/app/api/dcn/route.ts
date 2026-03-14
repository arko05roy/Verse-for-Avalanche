import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { runRound } from "../../../lib/dcn-engine";
import { assignProfile } from "../../../lib/groq";
import { roundStore } from "../../../lib/round-store";
import { x402Server, PAYMENT_CONFIG } from "../../../lib/x402-server";

const AGENTS = [
  { address: process.env.AGENT1_ADDRESS!, profileKey: "CIPHER" },
  { address: process.env.AGENT2_ADDRESS!, profileKey: "SAGE" },
  { address: process.env.AGENT3_ADDRESS!, profileKey: "SPARK" },
];

// Assign profiles on module load
for (const a of AGENTS) {
  if (a.address) assignProfile(a.address, a.profileKey);
}

const DCN_PAYMENT_CONFIG = {
  ...PAYMENT_CONFIG,
  description: "Start an Among Us round in the VERSE Agent Tribunal",
};

const handler = async (req: NextRequest): Promise<NextResponse> => {
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
};

export const POST = withX402(handler, DCN_PAYMENT_CONFIG, x402Server);

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
