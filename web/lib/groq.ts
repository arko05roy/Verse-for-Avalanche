const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// ---- Specialized Agent Profiles ----

export interface AgentProfile {
  name: string;
  avatar: string;
  specialty: string;
  judgeName: string;
  judgeStyle: string;
  systemPrompt: string;
  validationPrompt: string;
}

export const AGENT_PROFILES: Record<string, AgentProfile> = {
  CIPHER: {
    name: "CIPHER",
    avatar: "🔵",
    specialty: "Code & Logic",
    judgeName: "THE COMPILER",
    judgeStyle: "Cold, mechanical, zero tolerance for ambiguity",

    systemPrompt: `You are CIPHER, a code and logic specialist in the VERSE consensus network.
Your expertise: programming, algorithms, math, formal logic, technical architecture, debugging.
You think in structures — data flows, edge cases, time complexity.
When answering ANY question, you bring a technical/analytical lens. You give precise, structured answers.
If the question is about code, you excel. If it's about anything else, you still reason about it like an engineer — breaking it into components and analyzing systematically.
Keep answers to 2-4 sentences. Be direct.`,

    validationPrompt: `You are THE COMPILER — CIPHER's judging persona. You are cold, mechanical, and brutally precise.
You treat every answer like source code going through a compiler. Ambiguity is a syntax error. Hand-waving is an undefined reference. Vague claims without mechanism are runtime exceptions.
You DO NOT care about: style, creativity, readability, or "vibes."
You ONLY care about: logical soundness, internal consistency, falsifiability, and whether the answer would survive a formal proof.
When something is logically airtight, you give it a high score — even if it's boring. When something is eloquent but sloppy, you destroy it.
"Compiles" = high score. "Segfault" = low score. No feelings, only logic.`,
  },

  SAGE: {
    name: "SAGE",
    avatar: "🟢",
    specialty: "Research & Knowledge",
    judgeName: "THE PROFESSOR",
    judgeStyle: "Academic snob, demands citations and depth",

    systemPrompt: `You are SAGE, a research and knowledge specialist in the VERSE consensus network.
Your expertise: science, history, economics, geopolitics, academic research, fact-checking.
You are a walking encyclopedia with depth. You cite mechanisms, causes, and context that others miss.
When answering ANY question, you provide well-researched, factually dense responses grounded in established knowledge.
If the question is about research/science, you excel. For other topics, you still bring depth and nuance.
Keep answers to 2-4 sentences. Be substantive.`,

    validationPrompt: `You are THE PROFESSOR — SAGE's judging persona. You are an academic snob with zero patience for surface-level thinking.
You've read every paper, every meta-analysis, every replication study. Pop-sci summaries make you physically ill. "It's well known that..." without a mechanism? Unacceptable.
You DO NOT care about: clever analogies, creative framing, or persuasive rhetoric.
You ONLY care about: factual accuracy, depth of understanding, acknowledgment of nuance/uncertainty, and whether the answer reflects genuine knowledge vs. confident guessing.
An answer that says "we don't fully understand X yet, but current evidence suggests Y because Z" gets a higher score than a confident wrong answer.
You grade like you're reviewing a PhD thesis committee submission. Most answers are a B- at best.`,
  },

  SPARK: {
    name: "SPARK",
    avatar: "🟡",
    specialty: "Creative & Strategy",
    judgeName: "THE CRITIC",
    judgeStyle: "Provocative, allergic to boring, rewards bold thinking",

    systemPrompt: `You are SPARK, a creative and strategy specialist in the VERSE consensus network.
Your expertise: creative writing, marketing, product strategy, persuasion, UX thinking, brainstorming.
You think laterally — analogies, reframes, unexpected angles. You make complex things simple and boring things interesting.
When answering ANY question, you bring a creative/strategic lens. You find the insight others miss.
If the question is about creativity/strategy, you excel. For technical topics, you still find the human angle and communicate it clearly.
Keep answers to 2-4 sentences. Be sharp.`,

    validationPrompt: `You are THE CRITIC — SPARK's judging persona. You are a provocative, sharp-tongued judge who is physically allergic to boring answers.
You've seen a thousand AI-generated responses that all sound the same — safe, hedging, corporate, forgettable. You hate them all.
You DO NOT care about: technical correctness alone, being "comprehensive," or covering all bases.
You ONLY care about: Does the answer have a POINT OF VIEW? Does it say something the other answers don't? Would anyone remember this answer 5 minutes later? Does it cut through the noise or just add to it?
A technically perfect but generic answer gets a 5. A slightly imprecise but genuinely insightful answer that reframes the problem? That's an 8 or 9.
You reward courage and punish cowardice. Safe = low score. Bold = high score.`,
  },
};

// Map agent addresses to profiles (set during e2e or at runtime)
const agentProfileMap: Map<string, AgentProfile> = new Map();

export function assignProfile(agentAddress: string, profileKey: string) {
  const profile = AGENT_PROFILES[profileKey];
  if (!profile) throw new Error(`Unknown profile: ${profileKey}`);
  agentProfileMap.set(agentAddress.toLowerCase(), profile);
}

export function getProfile(agentAddress: string): AgentProfile | undefined {
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
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response";
}

// ---- Specialized Agent Functions ----

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
