import { NextRequest, NextResponse } from "next/server";
import { runRound } from "../../../lib/dcn-engine";
import { assignProfile } from "../../../lib/groq";
import { roundStore } from "../../../lib/round-store";
import { roomStore } from "../../../lib/room-store";

// 3 agent wallet addresses — dynamically assigned per room
const AGENT_ADDRESSES = [
  process.env.AGENT1_ADDRESS!,
  process.env.AGENT2_ADDRESS!,
  process.env.AGENT3_ADDRESS!,
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, roomId } = body;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Get room agents or default
    const room = roomId ? roomStore.get(roomId) : null;
    const agentKeys = room?.agents || ["SENTINEL", "FORTRESS", "PHANTOM"];

    // Dynamically assign profile keys to wallet addresses
    const agents = agentKeys.map((profileKey, i) => {
      const address = AGENT_ADDRESSES[i % AGENT_ADDRESSES.length];
      assignProfile(address, profileKey);
      return { address, profileKey };
    });

    if (room) roomStore.incrementRound(roomId);

    const roundIdStr = `round-${Date.now()}`;

    runRound(roundIdStr, prompt, agents, roomId || undefined).catch((err) => {
      console.error("DCN round error:", err);
      roundStore.finalize(roundIdStr);
      if (room) roomStore.decrementActive(roomId);
    }).then(() => {
      if (room) roomStore.decrementActive(roomId);
    });

    return NextResponse.json({ roundId: roundIdStr, roomId: roomId || "security", status: "started" });
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
