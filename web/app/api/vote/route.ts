import { NextRequest, NextResponse } from "next/server";
import { taskStore } from "@/lib/task-store";
import { finalizeOnChain } from "@/lib/verse-client";

const CONSENSUS_THRESHOLD = 2;

export async function POST(req: NextRequest) {
  try {
    const { verseId, scores, voterAddress } = await req.json();

    if (!verseId || !scores || !voterAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const task = taskStore.get(verseId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (taskStore.hasVoted(verseId, voterAddress)) {
      return NextResponse.json({ error: "Already voted" }, { status: 400 });
    }

    // Ensure voter isn't scoring themselves
    if (scores[voterAddress]) {
      return NextResponse.json(
        { error: "Cannot vote for self" },
        { status: 400 }
      );
    }

    taskStore.addVotes(verseId, voterAddress, scores);

    const updatedTask = taskStore.get(verseId)!;
    const consensusReached =
      updatedTask.votes.length >= CONSENSUS_THRESHOLD;

    let txHash: string | undefined;

    if (consensusReached && updatedTask.status !== "finalized") {
      try {
        // Aggregate scores
        const agentScores: Record<string, number[]> = {};
        for (const vote of updatedTask.votes) {
          for (const [agent, score] of Object.entries(vote.scores)) {
            if (!agentScores[agent]) agentScores[agent] = [];
            agentScores[agent].push(score);
          }
        }

        const avgScores: Record<string, number> = {};
        let totalScore = 0;
        for (const [agent, scores] of Object.entries(agentScores)) {
          avgScores[agent] =
            scores.reduce((a, b) => a + b, 0) / scores.length;
          totalScore += avgScores[agent];
        }

        const rewards = Object.entries(avgScores).map(([agent, score]) => ({
          agentAddress: agent,
          amount: String(
            Math.floor(
              (Number(updatedTask.bounty) * score) / totalScore
            )
          ),
        }));

        // Mark as ready for finalization off-chain
        // On-chain finalization is handled by the e2e script or /api/finalize
        taskStore.finalize(verseId, rewards, "pending-onchain");
      } catch (err: any) {
        console.error("Finalization error:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      consensusReached,
      txHash,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
