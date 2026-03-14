import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { taskStore } from "@/lib/task-store";
import { x402Server, PAYMENT_CONFIG } from "@/lib/x402-server";

const handler = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const { verseId, prompt, bounty, poster } = await req.json();

    if (!verseId || !prompt || !bounty) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    taskStore.create(verseId, {
      prompt,
      bounty: String(bounty),
      poster: poster || "unknown",
    });

    return NextResponse.json({ success: true, verseId });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

export const POST = withX402(handler, PAYMENT_CONFIG, x402Server);
