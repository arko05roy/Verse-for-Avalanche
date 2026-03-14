import { NextRequest, NextResponse } from "next/server";
import { taskStore } from "@/lib/task-store";
import { finalizeOnChain } from "@/lib/verse-client";

export async function POST(req: NextRequest) {
  try {
    const { verseId } = await req.json();
    const task = taskStore.get(verseId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status === "finalized") {
      return NextResponse.json({ error: "Already finalized" }, { status: 400 });
    }

    // Aggregate votes
    const agentScores: Record<string, number[]> = {};
    for (const vote of task.votes) {
      for (const [agent, score] of Object.entries(vote.scores)) {
        if (!agentScores[agent]) agentScores[agent] = [];
        agentScores[agent].push(score);
      }
    }

    const avgScores: Record<string, number> = {};
    let totalScore = 0;
    for (const [agent, scores] of Object.entries(agentScores)) {
      avgScores[agent] = scores.reduce((a, b) => a + b, 0) / scores.length;
      totalScore += avgScores[agent];
    }

    const rewards = Object.entries(avgScores).map(([agent, score]) => ({
      agentAddress: agent,
      amount: String(Math.floor((Number(task.bounty) * score) / totalScore)),
    }));

    const taskId = Number(verseId) - 1;
    const result = await finalizeOnChain(
      taskId,
      Object.keys(avgScores),
      Object.values(avgScores)
    );

    taskStore.finalize(verseId, rewards, result.txHash);

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      rewards,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
