import { NextRequest, NextResponse } from "next/server";
import { taskStore } from "@/lib/task-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ verseId: string }> }
) {
  const { verseId } = await params;
  const task = taskStore.get(verseId);

  if (task && task.status === "pending") {
    return NextResponse.json({
      status: "pending",
      prompt: task.prompt,
      bounty: task.bounty,
      verseId: task.verseId,
    });
  }

  return NextResponse.json({ status: "no_task" });
}
