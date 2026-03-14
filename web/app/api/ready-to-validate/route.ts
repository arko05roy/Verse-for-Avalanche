import { NextRequest, NextResponse } from "next/server";
import { taskStore } from "@/lib/task-store";

export async function GET(req: NextRequest) {
  const agentAddress = req.nextUrl.searchParams.get("agentAddress");
  const tasks = taskStore.getReadyToValidate();

  const result = tasks.map((t) => ({
    verseId: t.verseId,
    prompt: t.prompt,
    submissions: t.submissions
      .filter((s) => s.agentAddress !== agentAddress)
      .map((s) => ({ agentAddress: s.agentAddress, answer: s.answer })),
  }));

  return NextResponse.json({ tasks: result });
}
