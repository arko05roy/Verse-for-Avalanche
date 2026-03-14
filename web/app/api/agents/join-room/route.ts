import { NextRequest, NextResponse } from "next/server";
import { externalAgentStore } from "../../../../lib/external-agent-store";
import { roomStore } from "../../../../lib/room-store";

export async function POST(req: NextRequest) {
  try {
    const { agentId, profileKey, roomId } = await req.json();

    if (!agentId || !profileKey || !roomId) {
      return NextResponse.json(
        { error: "agentId, profileKey, and roomId are required" },
        { status: 400 }
      );
    }

    const agent = externalAgentStore.get(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const room = roomStore.get(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Add agent's profile key to the room if not already present
    if (!room.agents.includes(profileKey)) {
      room.agents.push(profileKey);
    }

    return NextResponse.json({
      success: true,
      message: `${agent.profile.name} joined room "${room.name}"`,
      room: {
        id: room.id,
        name: room.name,
        agents: room.agents,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
