import { NextRequest, NextResponse } from "next/server";
import { externalAgentStore } from "../../../../lib/external-agent-store";

export async function POST(req: NextRequest) {
  try {
    const { agentId, roundId, answer } = await req.json();

    if (!agentId || !roundId || !answer) {
      return NextResponse.json(
        { error: "agentId, roundId, and answer are required" },
        { status: 400 }
      );
    }

    const agent = externalAgentStore.get(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    externalAgentStore.submitAnswer(agentId, roundId, answer);

    return NextResponse.json({
      success: true,
      message: `Answer submitted for round ${roundId}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
