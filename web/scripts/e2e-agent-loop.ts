/**
 * VERSE End-to-End Agent Flow — Specialized Agents
 *
 * 3 specialized agents:
 *   🔵 CIPHER — Code & Logic specialist
 *   🟢 SAGE   — Research & Knowledge specialist
 *   🟡 SPARK  — Creative & Strategy specialist
 *
 * Each answers from their expertise, validates through their lens.
 *
 * Run: npx tsx scripts/e2e-agent-loop.ts
 */
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { resolve } from "path";
import abi from "../lib/abi.json";
import { AGENT_PROFILES, assignProfile, callGroq } from "../lib/groq";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const API = "http://localhost:3000";
const FUJI_USDC = "0x5425890298aed601595a70AB815c96711a31Bc65";

const provider = new ethers.JsonRpcProvider(process.env.FUJI_RPC_URL);
const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);

const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)", "function approve(address,uint256) returns (bool)"];
const usdc = new ethers.Contract(FUJI_USDC, erc20Abi, provider);

const agents = [
  { profile: "CIPHER", key: process.env.AGENT1_PRIVATE_KEY!, address: process.env.AGENT1_ADDRESS! },
  { profile: "SAGE",   key: process.env.AGENT2_PRIVATE_KEY!, address: process.env.AGENT2_ADDRESS! },
  { profile: "SPARK",  key: process.env.AGENT3_PRIVATE_KEY!, address: process.env.AGENT3_ADDRESS! },
];

// Assign profiles
for (const a of agents) assignProfile(a.address, a.profile);

const verseMaster = new ethers.Contract(process.env.VERSE_MASTER_ADDRESS!, abi.verseMasterAbi, provider);

const TASK_PROMPT = "What is the most important problem in AI safety and how should we approach solving it?";
const BOUNTY = 100_000n; // 0.1 USDC

async function apiPost(path: string, body: object) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`);
  return res.json();
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  VERSE — Specialized Agent Consensus (Real USDC)");
  console.log("═══════════════════════════════════════════════════\n");

  for (const a of agents) {
    const p = AGENT_PROFILES[a.profile];
    console.log(`  ${p.avatar} ${p.name.padEnd(6)} works as: ${p.specialty}`);
    console.log(`           judges as: ${p.judgeName} (${p.judgeStyle})`);
  }
  console.log();

  // Groq sanity
  const test = await callGroq("Say 'ok' and nothing else.");
  console.log(`Groq: "${test.trim()}" ✅\n`);

  const taskCountBefore = Number(await verseMaster.taskCount());
  const onChainTaskId = taskCountBefore;
  const verseId = `verse-${Date.now()}`;

  // ---- Phase 0: Approvals ----
  console.log("PHASE 0: Ensure approvals");
  const vmAddress = await verseMaster.getAddress();
  const adminUsdc = usdc.connect(admin);
  const allowance = await usdc.allowance(admin.address, vmAddress);
  if (allowance < BOUNTY) {
    const tx = await adminUsdc.approve(vmAddress, ethers.MaxUint256);
    await tx.wait();
    console.log("  ✅ Admin approved VerseMaster");
  } else {
    console.log("  ✅ Admin already approved");
  }

  // ---- Phase 1: Post Task ----
  console.log(`\nPHASE 1: Post Task (0.1 real USDC bounty)`);
  console.log(`  "${TASK_PROMPT}"`);

  const vmAdmin = verseMaster.connect(admin);
  const postTx = await vmAdmin.postTask(TASK_PROMPT, BOUNTY);
  await postTx.wait();
  console.log(`  ✅ On-chain (taskId=${onChainTaskId}, tx=${postTx.hash.slice(0, 14)}...)`);

  await apiPost("/api/seed", {
    verseId, prompt: TASK_PROMPT,
    bounty: Number(BOUNTY) / 1e6, poster: admin.address,
  });
  console.log(`  ✅ Off-chain seeded`);

  // ---- Phase 2: Specialized Agents Answer ----
  console.log(`\nPHASE 2: Agents Answer (each from their specialty)`);

  const answers: { agent: string; answer: string; profile: string }[] = [];

  for (const agent of agents) {
    const p = AGENT_PROFILES[agent.profile];
    console.log(`\n  ${p.avatar} ${p.name} [${p.specialty}] thinking...`);

    const answer = await callGroq(TASK_PROMPT, p.systemPrompt);
    console.log(`  ${p.avatar} Answer: "${answer.trim().slice(0, 140)}..."`);

    // Off-chain
    await apiPost("/api/submit", {
      verseId, answer: answer.trim(), agentAddress: agent.address,
    });

    // On-chain
    const wallet = new ethers.Wallet(agent.key, provider);
    const tx = await verseMaster.connect(wallet).submitAnswer(onChainTaskId);
    await tx.wait();
    console.log(`  ${p.avatar} ✅ Submitted (tx=${tx.hash.slice(0, 14)}...)`);

    answers.push({ agent: agent.address, answer: answer.trim(), profile: agent.profile });
  }

  // ---- Phase 3: Cross-Validation (each judges through their lens) ----
  console.log(`\n\nPHASE 3: Cross-Validation (specialized scoring)`);

  for (const voter of agents) {
    const vp = AGENT_PROFILES[voter.profile];
    const othersAnswers = answers.filter((a) => a.agent !== voter.address);

    console.log(`\n  ${vp.avatar} ${vp.name} switches to → ${vp.judgeName} (${vp.judgeStyle})`);

    const answerList = othersAnswers
      .map((a) => {
        const ap = AGENT_PROFILES[a.profile];
        return `${ap.avatar} ${ap.name} (${a.agent}):\n${a.answer}`;
      })
      .join("\n\n");

    const scoreResponse = await callGroq(
      `Score each agent's answer to "${TASK_PROMPT}" on a scale of 1-10 (integers).

Answers:
${answerList}

Respond ONLY with a JSON object mapping the 0x addresses to scores. Example: {"0xabc...": 7, "0xdef...": 9}`,
      vp.validationPrompt
    );
    console.log(`  ${vp.avatar} Raw: ${scoreResponse.trim()}`);

    const jsonMatch = scoreResponse.match(/\{[^}]+\}/);
    if (!jsonMatch) {
      console.error(`  ${vp.avatar} ❌ Parse failed, skipping`);
      continue;
    }

    const rawScores: Record<string, number> = JSON.parse(jsonMatch[0]);
    const cleanScores: Record<string, number> = {};
    for (const other of othersAnswers) {
      const raw = rawScores[other.agent] || rawScores[Object.keys(rawScores)[othersAnswers.indexOf(other)]];
      cleanScores[other.agent] = Math.max(1, Math.min(10, Math.round(raw || 5)));
    }
    console.log(`  ${vp.avatar} Scores:`, cleanScores);

    // Off-chain vote
    await apiPost("/api/vote", {
      verseId, scores: cleanScores, voterAddress: voter.address,
    });

    // On-chain vote
    const wallet = new ethers.Wallet(voter.key, provider);
    const candidates = Object.keys(cleanScores);
    const scoreValues = candidates.map((c) => cleanScores[c]);
    const tx = await verseMaster.connect(wallet).submitVote(onChainTaskId, candidates, scoreValues);
    await tx.wait();
    console.log(`  ${vp.avatar} ✅ Voted on-chain (tx=${tx.hash.slice(0, 14)}...)`);
  }

  // ---- Phase 4: Finalize ----
  console.log(`\n\nPHASE 4: Finalize`);
  const finTx = await vmAdmin.finalize(onChainTaskId);
  await finTx.wait();
  console.log(`  ✅ Finalized (tx=${finTx.hash})`);
  await apiPost("/api/finalize", { verseId });

  // ---- Phase 5: Results ----
  console.log(`\n\nPHASE 5: Results`);
  const task = await verseMaster.getTask(onChainTaskId);
  console.log(`  On-chain finalized: ${task.finalized}`);

  console.log("\n  Agent Earnings (real Fuji USDC):");
  for (const agent of agents) {
    const p = AGENT_PROFILES[agent.profile];
    const info = await verseMaster.getAgentInfo(agent.address);
    const bal = await usdc.balanceOf(agent.address);
    console.log(
      `    ${p.avatar} ${p.name.padEnd(6)} [${p.specialty.padEnd(20)}]: ` +
      `earned=${(Number(info.totalEarned) / 1e6).toFixed(4)} USDC, ` +
      `balance=${(Number(bal) / 1e6).toFixed(4)} USDC`
    );
  }

  const state = await apiGet(`/api/state?verseId=${verseId}`);
  console.log(`\n  Off-chain: ${state.status}`);
  console.log(`  Snowtrace: https://testnet.snowtrace.io/tx/${finTx.hash}`);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✅ Specialized Agent Consensus Complete!");
  console.log("═══════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message || err);
  process.exit(1);
});
