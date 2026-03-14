import { NextRequest, NextResponse } from "next/server";
import { runRound } from "../../../lib/dcn-engine";
import { assignProfile } from "../../../lib/groq";
import { roundStore } from "../../../lib/round-store";
import { roomStore } from "../../../lib/room-store";

const AGENT_MAP: Record<string, { address: string; profileKey: string }> = {
  CIPHER: { address: process.env.AGENT1_ADDRESS!, profileKey: "CIPHER" },
  SAGE: { address: process.env.AGENT2_ADDRESS!, profileKey: "SAGE" },
  SPARK: { address: process.env.AGENT3_ADDRESS!, profileKey: "SPARK" },
};

// Assign profiles on module load
for (const a of Object.values(AGENT_MAP)) {
  if (a.address) assignProfile(a.address, a.profileKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, roomId } = body;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Get room agents or default to all
    const room = roomId ? roomStore.get(roomId) : null;
    const agentKeys = room?.agents || ["CIPHER", "SAGE", "SPARK"];
    const agents = agentKeys
      .map((k) => AGENT_MAP[k])
      .filter(Boolean);

    if (room) roomStore.incrementRound(roomId);

    const roundIdStr = `round-${Date.now()}`;

    runRound(roundIdStr, prompt, agents).catch((err) => {
      console.error("DCN round error:", err);
      roundStore.finalize(roundIdStr);
      if (room) roomStore.decrementActive(roomId);
    }).then(() => {
      if (room) roomStore.decrementActive(roomId);
    });

    return NextResponse.json({ roundId: roundIdStr, roomId: roomId || "general", status: "started" });
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
