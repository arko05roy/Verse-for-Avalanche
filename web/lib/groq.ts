// Re-export profiles so existing server-side imports still work
export { AGENT_PROFILES, type AgentProfile } from "./agent-profiles";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// Map agent addresses to profiles (set during e2e or at runtime)
import { AGENT_PROFILES as PROFILES } from "./agent-profiles";
const agentProfileMap: Map<string, (typeof PROFILES)[string]> = new Map();

export function assignProfile(agentAddress: string, profileKey: string) {
  const profile = PROFILES[profileKey];
  if (!profile) throw new Error(`Unknown profile: ${profileKey}`);
  agentProfileMap.set(agentAddress.toLowerCase(), profile);
}

export function getProfile(agentAddress: string) {
  return agentProfileMap.get(agentAddress.toLowerCase());
}

// ---- Core LLM Call ----

export async function callGroq(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY || ""}`,
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 300, temperature: 0.7 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response";
}

export async function generateAnswer(taskPrompt: string, agentAddress?: string): Promise<string> {
  const profile = agentAddress ? getProfile(agentAddress) : undefined;
  const system = profile?.systemPrompt ||
    "You are an AI agent in a consensus network. Answer the task concisely and accurately in 2-3 sentences.";
  return callGroq(taskPrompt, system);
}

export async function scoreAnswers(
  taskPrompt: string,
  answers: { agent: string; answer: string }[],
  voterAddress?: string
): Promise<Record<string, number>> {
  const profile = voterAddress ? getProfile(voterAddress) : undefined;

  const answerList = answers
    .map((a) => {
      const p = getProfile(a.agent);
      const label = p ? `${p.avatar} ${p.name} (${a.agent})` : a.agent;
      return `${label}:\n${a.answer}`;
    })
    .join("\n\n");

  const system = profile?.validationPrompt ||
    "You are a validator in an AI consensus network. Return only valid JSON.";

  const response = await callGroq(
    `Score each agent's answer to "${taskPrompt}" on a scale of 1-10 (integers only).

Answers:
${answerList}

Respond ONLY with a JSON object mapping agent addresses (the 0x... addresses, not names) to integer scores (1-10). Example: {"0xabc": 7, "0xdef": 9}
No other text.`,
    system
  );

  const jsonMatch = response.match(/\{[^}]+\}/);
  if (!jsonMatch) throw new Error(`Could not parse scores from: ${response}`);

  const scores = JSON.parse(jsonMatch[0]);
  for (const key of Object.keys(scores)) {
    scores[key] = Math.max(1, Math.min(10, Math.round(scores[key])));
  }
  return scores;
}
