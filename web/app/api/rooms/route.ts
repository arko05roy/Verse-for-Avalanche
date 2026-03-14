import { NextRequest, NextResponse } from "next/server";
import { roomStore } from "../../../lib/room-store";

export async function GET() {
  return NextResponse.json({ rooms: roomStore.getAll() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, domain, icon, description, agents } = body;
    if (!id || !name || !domain) {
      return NextResponse.json({ error: "id, name, domain required" }, { status: 400 });
    }
    const room = roomStore.create({
      id,
      name,
      domain,
      icon: icon || "🎯",
      description: description || "",
      agents: agents || ["CIPHER", "SAGE", "SPARK"],
    });
    return NextResponse.json({ success: true, room });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
