import { NextRequest, NextResponse } from "next/server";
import { externalAgentStore } from "../../../../lib/external-agent-store";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const agent = externalAgentStore.get(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    task: agent.pendingTask,
    judgeTask: agent.pendingJudge,
  });
}
