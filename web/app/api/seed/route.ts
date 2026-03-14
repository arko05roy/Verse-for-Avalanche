import { NextRequest, NextResponse } from "next/server";
import { taskStore } from "@/lib/task-store";

export async function POST(req: NextRequest) {
  const { verseId, prompt, bounty, poster } = await req.json();
  taskStore.create(verseId, { prompt, bounty: String(bounty), poster: poster || "admin" });
  return NextResponse.json({ success: true, verseId });
}
