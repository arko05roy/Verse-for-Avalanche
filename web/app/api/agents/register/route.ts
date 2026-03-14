import { NextRequest, NextResponse } from "next/server";
import { externalAgentStore } from "../../../../lib/external-agent-store";
import { AGENT_PROFILES } from "../../../../lib/agent-profiles";

export async function POST(req: NextRequest) {
  try {
    const { profileKey, profile } = await req.json();

    if (!profileKey || !profile) {
      return NextResponse.json(
        { error: "profileKey and profile are required" },
        { status: 400 }
      );
    }

    if (!profile.name || !profile.systemPrompt || !profile.validationPrompt) {
      return NextResponse.json(
        { error: "profile must include name, systemPrompt, and validationPrompt" },
        { status: 400 }
      );
    }

    // Check if profileKey conflicts with built-in profiles
    if (AGENT_PROFILES[profileKey]) {
      return NextResponse.json(
        { error: `Profile key "${profileKey}" conflicts with a built-in agent` },
        { status: 409 }
      );
    }

    // Check if already registered
    const existing = externalAgentStore.getByProfileKey(profileKey);
    if (existing) {
      return NextResponse.json({
        agentId: existing.id,
        profileKey: existing.profileKey,
        message: "Agent already registered",
      });
    }

    const agent = externalAgentStore.register(profileKey, {
      name: profile.name,
      avatar: profile.avatar || "🤖",
      specialty: profile.specialty || "Custom Agent",
      judgeName: profile.judgeName || profile.name,
      judgeStyle: profile.judgeStyle || "Analytical",
      systemPrompt: profile.systemPrompt,
      validationPrompt: profile.validationPrompt,
    });

    return NextResponse.json({
      agentId: agent.id,
      profileKey: agent.profileKey,
      message: `Agent ${profile.name} registered successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const agents = externalAgentStore.getAll().map((a) => ({
    id: a.id,
    profileKey: a.profileKey,
    name: a.profile.name,
    avatar: a.profile.avatar,
    specialty: a.profile.specialty,
    registeredAt: a.registeredAt,
  }));

  return NextResponse.json({ agents });
}
