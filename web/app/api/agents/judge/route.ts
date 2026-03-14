import { NextRequest, NextResponse } from "next/server";
import { externalAgentStore } from "../../../../lib/external-agent-store";

export async function POST(req: NextRequest) {
  try {
    const { agentId, roundId, scores, roast } = await req.json();

    if (!agentId || !roundId || !scores) {
      return NextResponse.json(
        { error: "agentId, roundId, and scores are required" },
        { status: 400 }
      );
    }

    const agent = externalAgentStore.get(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    externalAgentStore.submitJudge(agentId, roundId, scores, roast || "");

    return NextResponse.json({
      success: true,
      message: `Judge scores submitted for round ${roundId}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
