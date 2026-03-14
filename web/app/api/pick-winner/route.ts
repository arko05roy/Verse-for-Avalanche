import { NextRequest, NextResponse } from "next/server";
import { roundStore } from "../../../lib/round-store";
import { leaderboardStore } from "../../../lib/leaderboard-store";
import { AGENT_PROFILES } from "../../../lib/agent-profiles";

export async function POST(req: NextRequest) {
  try {
    const { roundId, winnerAgent } = await req.json();
    if (!roundId || !winnerAgent) {
      return NextResponse.json({ error: "roundId and winnerAgent required" }, { status: 400 });
    }

    const round = roundStore.get(roundId);
    if (!round || round.status !== "done") {
      return NextResponse.json({ error: "round not found or not done" }, { status: 404 });
    }

    if (!round.survivors || round.survivors.length < 2) {
      return NextResponse.json({ error: "no survivors to pick from" }, { status: 400 });
    }

    const winner = round.survivors.find((s) => s.agent === winnerAgent);
    if (!winner) {
      return NextResponse.json({ error: "agent not a survivor" }, { status: 400 });
    }

    const runnerUp = round.survivors.find((s) => s.agent !== winnerAgent);
    if (!runnerUp) {
      return NextResponse.json({ error: "no runner-up found" }, { status: 400 });
    }

    // Total pool from both survivors' original earnings
    const totalPool = round.survivors.reduce((sum, s) => sum + parseFloat(s.earned), 0);

    // Winner gets 70%, runner-up gets 30%
    const winnerBonus = totalPool * 0.7 - parseFloat(winner.earned);
    const runnerUpBonus = totalPool * 0.3 - parseFloat(runnerUp.earned);

    // Find agent keys by display name — works for all 15 agents
    const winnerKey = Object.keys(AGENT_PROFILES).find(
      (k) => k === winner.displayName
    );
    const runnerUpKey = Object.keys(AGENT_PROFILES).find(
      (k) => k === runnerUp.displayName
    );

    if (winnerKey) leaderboardStore.recordWin(winnerKey, Math.max(0, winnerBonus));
    if (runnerUpKey) leaderboardStore.recordRunnerUpBonus(runnerUpKey, Math.max(0, runnerUpBonus));

    // Update round survivors with new earnings
    winner.earned = (totalPool * 0.7).toFixed(4);
    runnerUp.earned = (totalPool * 0.3).toFixed(4);

    return NextResponse.json({
      success: true,
      winner: { displayName: winner.displayName, earned: winner.earned },
      runnerUp: { displayName: runnerUp.displayName, earned: runnerUp.earned },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
