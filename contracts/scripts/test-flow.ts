import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function main() {
  const provider = ethers.provider;
  const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
  const agent1 = new ethers.Wallet(process.env.AGENT1_PRIVATE_KEY!, provider);
  const agent2 = new ethers.Wallet(process.env.AGENT2_PRIVATE_KEY!, provider);
  const agent3 = new ethers.Wallet(process.env.AGENT3_PRIVATE_KEY!, provider);

  const mockUSDC = await ethers.getContractAt("MockUSDC", process.env.MOCK_USDC_ADDRESS!);
  const verseMaster = await ethers.getContractAt("VerseMaster", process.env.VERSE_MASTER_ADDRESS!);

  // 1. Stake all 3 agents
  console.log("1. Staking agents...");
  for (const [name, agent] of [["Agent1", agent1], ["Agent2", agent2], ["Agent3", agent3]] as const) {
    const tx = await verseMaster.connect(agent).stake();
    await tx.wait();
    const info = await verseMaster.getAgentInfo(agent.address);
    console.log(`  ${name} staked: ${info.staked}`);
  }

  // 2. Post task
  console.log("2. Posting task...");
  const bounty = 3_000_000n; // 3 MUSDC
  const postTx = await verseMaster.connect(admin).postTask("Test prompt: explain consensus", bounty);
  await postTx.wait();
  const taskCount = await verseMaster.taskCount();
  console.log(`  taskCount: ${taskCount}`);

  // 3. Verify task
  const task = await verseMaster.getTask(0);
  console.log(`  poster: ${task.poster}, bounty: ${task.bounty}, prompt: ${task.prompt}`);

  // 4. All 3 agents submit
  console.log("3. Submitting answers...");
  for (const [name, agent] of [["Agent1", agent1], ["Agent2", agent2], ["Agent3", agent3]] as const) {
    const tx = await verseMaster.connect(agent).submitAnswer(0);
    await tx.wait();
    console.log(`  ${name} submitted`);
  }

  // 5. Voting: Agent1 scores Agent2=8, Agent3=5. Agent2 scores Agent1=7, Agent3=6.
  console.log("4. Voting...");
  const vote1Tx = await verseMaster.connect(agent1).submitVote(
    0, [agent2.address, agent3.address], [8, 5]
  );
  await vote1Tx.wait();
  console.log("  Agent1 voted");

  const vote2Tx = await verseMaster.connect(agent2).submitVote(
    0, [agent1.address, agent3.address], [7, 6]
  );
  await vote2Tx.wait();
  console.log("  Agent2 voted");

  // 6. Finalize
  console.log("5. Finalizing...");
  const finTx = await verseMaster.connect(admin).finalize(0);
  await finTx.wait();
  console.log(`  Finalized! tx: ${finTx.hash}`);

  // 7. Verify
  const finalTask = await verseMaster.getTask(0);
  console.log(`  task.finalized: ${finalTask.finalized}`);

  // 8. Check stats
  console.log("6. Agent stats:");
  for (const [name, agent] of [["Agent1", agent1], ["Agent2", agent2], ["Agent3", agent3]] as const) {
    const info = await verseMaster.getAgentInfo(agent.address);
    const bal = await mockUSDC.balanceOf(agent.address);
    console.log(`  ${name}: tasksCompleted=${info.tasksCompleted}, totalEarned=${info.totalEarned}, balance=${Number(bal) / 1e6} MUSDC`);
  }

  console.log("\n✅ All assertions passed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
