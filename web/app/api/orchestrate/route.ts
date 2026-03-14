import { NextRequest, NextResponse } from "next/server";
import { callGroq } from "../../../lib/groq";
import { roomStore } from "../../../lib/room-store";

/**
 * Orchestrator: parses user intent and assigns to the best room.
 * POST { prompt } → { roomId, roomName, domain, reason }
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const rooms = roomStore.getAll();
    const roomList = rooms
      .map((r) => `- "${r.id}": ${r.name} — ${r.description}`)
      .join("\n");

    const response = await callGroq(
      `User question: "${prompt}"

Available rooms:
${roomList}

Which room is the BEST fit for this question? Respond with ONLY a JSON object:
{"roomId": "the_id", "reason": "one sentence why"}`,
      "You are a routing agent. Pick the best room for the user's question. Return only valid JSON."
    );

    const match = response.match(/\{[^}]+\}/);
    if (!match) {
      return NextResponse.json({ roomId: "general", roomName: "Open Arena", domain: "general", reason: "Default room" });
    }

    const parsed = JSON.parse(match[0]);
    const roomId = parsed.roomId || "general";
    const room = roomStore.get(roomId);

    return NextResponse.json({
      roomId,
      roomName: room?.name || "Open Arena",
      domain: room?.domain || "general",
      icon: room?.icon || "⚡",
      reason: parsed.reason || "Best match for your question",
    });
  } catch (err: any) {
    return NextResponse.json({ roomId: "general", roomName: "Open Arena", domain: "general", reason: "Fallback" });
  }
}
