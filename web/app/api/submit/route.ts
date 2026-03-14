import { NextRequest, NextResponse } from "next/server";
import { taskStore } from "@/lib/task-store";

export async function POST(req: NextRequest) {
  try {
    const { verseId, answer, agentAddress } = await req.json();

    if (!verseId || !answer || !agentAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const task = taskStore.get(verseId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    taskStore.addSubmission(verseId, agentAddress, answer);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
