import { ethers } from "ethers";
import abi from "./abi.json";

const provider = new ethers.JsonRpcProvider(
  process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc"
);

function getVerseMaster(signer?: ethers.Signer) {
  return new ethers.Contract(
    process.env.VERSE_MASTER_ADDRESS!,
    abi.verseMasterAbi,
    signer || provider
  );
}

function getAdminSigner() {
  return new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
}

function getAgentSigner(privateKey: string) {
  return new ethers.Wallet(privateKey, provider);
}

// Map agent addresses to private keys (server-side only)
const AGENT_KEYS: Record<string, string> = {
  [process.env.AGENT1_ADDRESS?.toLowerCase() || ""]: process.env.AGENT1_PRIVATE_KEY || "",
  [process.env.AGENT2_ADDRESS?.toLowerCase() || ""]: process.env.AGENT2_PRIVATE_KEY || "",
  [process.env.AGENT3_ADDRESS?.toLowerCase() || ""]: process.env.AGENT3_PRIVATE_KEY || "",
};

/**
 * Full on-chain settlement for a DCN round:
 *   1. Admin posts task with bounty
 *   2. Each agent submits answer on-chain
 *   3. Each agent submits votes on-chain (scores for others)
 *   4. Admin finalizes → contract distributes rewards + slashes
 *
 * Returns tx hash of the finalize transaction.
 */
export async function settleRoundOnChain(
  prompt: string,
  bounty: bigint,
  agentAddresses: string[],
  scores: Record<string, Record<string, number>> // voter -> { candidate -> score }
): Promise<{ txHash: string; taskId: number }> {
  const admin = getAdminSigner();
  const vm = getVerseMaster(admin);

  // 1. Post task
  const taskId = Number(await vm.taskCount());
  const postTx = await vm.postTask(prompt, bounty);
  await postTx.wait();
  console.log(`[on-chain] Task posted (id=${taskId})`);

  // 2. Each agent submits answer
  for (const addr of agentAddresses) {
    const key = AGENT_KEYS[addr.toLowerCase()];
    if (!key) continue;
    const agentVm = getVerseMaster(getAgentSigner(key));
    const tx = await agentVm.submitAnswer(taskId);
    await tx.wait();
  }
  console.log(`[on-chain] ${agentAddresses.length} agents submitted answers`);

  // 3. Each agent submits votes
  for (const voterAddr of Object.keys(scores)) {
    const key = AGENT_KEYS[voterAddr.toLowerCase()];
    if (!key) continue;
    const voterScores = scores[voterAddr];
    const candidates = Object.keys(voterScores);
    const scoreValues = candidates.map((c) => voterScores[c]);

    const voterVm = getVerseMaster(getAgentSigner(key));
    const tx = await voterVm.submitVote(taskId, candidates, scoreValues);
    await tx.wait();
  }
  console.log(`[on-chain] ${Object.keys(scores).length} agents voted`);

  // 4. Finalize
  const finTx = await vm.finalize(taskId);
  const receipt = await finTx.wait();
  console.log(`[on-chain] Finalized (tx=${receipt.hash})`);

  return { txHash: receipt.hash, taskId };
}

export async function finalizeOnChain(
  taskId: number,
  agents: string[],
  scores: number[]
) {
  const signer = getAdminSigner();
  const vm = getVerseMaster(signer);
  const tx = await vm.finalize(taskId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

export async function getAgentInfo(address: string) {
  const vm = getVerseMaster();
  const info = await vm.getAgentInfo(address);
  return {
    staked: info.staked,
    tasksCompleted: Number(info.tasksCompleted),
    totalEarned: Number(info.totalEarned),
    stakeBalance: Number(info.stakeBalance),
    slashCount: Number(info.slashCount),
  };
}

export async function getTask(taskId: number) {
  const vm = getVerseMaster();
  const task = await vm.getTask(taskId);
  return {
    poster: task.poster,
    prompt: task.prompt,
    bounty: Number(task.bounty),
    finalized: task.finalized,
    submitters: task.submitters,
  };
}

export async function getTaskCount() {
  const vm = getVerseMaster();
  return Number(await vm.taskCount());
}
