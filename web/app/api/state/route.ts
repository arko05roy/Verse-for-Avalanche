import { NextRequest, NextResponse } from "next/server";
import { taskStore } from "@/lib/task-store";

export async function GET(req: NextRequest) {
  const verseId = req.nextUrl.searchParams.get("verseId");

  if (verseId) {
    const task = taskStore.get(verseId);
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  }

  return NextResponse.json({ tasks: taskStore.getAll() });
}
