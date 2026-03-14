import { NextResponse } from "next/server";
import { leaderboardStore } from "../../../lib/leaderboard-store";

export async function GET() {
  return NextResponse.json({ leaderboard: leaderboardStore.getAll() });
}
