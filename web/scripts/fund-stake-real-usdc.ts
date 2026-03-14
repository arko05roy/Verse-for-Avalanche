/**
 * Fund agents with real Fuji USDC, approve VerseMaster, and stake.
 *
 * Admin sends 2 USDC to each agent (1 for stake, 1 for bounty buffer).
 * Each agent approves VerseMaster, then stakes.
 *
 * Run: npx tsx scripts/fund-stake-real-usdc.ts
 */
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { resolve } from "path";
import abi from "../lib/abi.json";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const FUJI_USDC = "0x5425890298aed601595a70AB815c96711a31Bc65";
const provider = new ethers.JsonRpcProvider(process.env.FUJI_RPC_URL);
const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);

const erc20Abi = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const agents = [
  { name: "Agent1", key: process.env.AGENT1_PRIVATE_KEY!, address: process.env.AGENT1_ADDRESS! },
  { name: "Agent2", key: process.env.AGENT2_PRIVATE_KEY!, address: process.env.AGENT2_ADDRESS! },
  { name: "Agent3", key: process.env.AGENT3_PRIVATE_KEY!, address: process.env.AGENT3_ADDRESS! },
];

const VM_ADDRESS = process.env.VERSE_MASTER_ADDRESS!;
const FUND_AMOUNT = 2_000_000n; // 2 USDC per agent

async function main() {
  const usdc = new ethers.Contract(FUJI_USDC, erc20Abi, admin);
  const vm = new ethers.Contract(VM_ADDRESS, abi.verseMasterAbi, provider);

  const adminBal = await usdc.balanceOf(admin.address);
  console.log(`Admin USDC balance: ${Number(adminBal) / 1e6}`);
  console.log(`VerseMaster: ${VM_ADDRESS}`);
  console.log(`Payment token check: ${await vm.paymentToken()}\n`);

  // Fund each agent with 2 USDC
  for (const agent of agents) {
    console.log(`--- ${agent.name} (${agent.address}) ---`);

    const bal = await usdc.balanceOf(agent.address);
    if (bal >= FUND_AMOUNT) {
      console.log(`  Already has ${Number(bal) / 1e6} USDC, skipping transfer`);
    } else {
      const tx = await usdc.transfer(agent.address, FUND_AMOUNT);
      await tx.wait();
      console.log(`  ✅ Sent ${Number(FUND_AMOUNT) / 1e6} USDC (tx: ${tx.hash.slice(0, 14)}...)`);
    }

    // Agent approves VerseMaster
    const agentWallet = new ethers.Wallet(agent.key, provider);
    const agentUsdc = new ethers.Contract(FUJI_USDC, erc20Abi, agentWallet);
    const allowance = await agentUsdc.allowance(agent.address, VM_ADDRESS);
    if (allowance < ethers.MaxUint256 / 2n) {
      const appTx = await agentUsdc.approve(VM_ADDRESS, ethers.MaxUint256);
      await appTx.wait();
      console.log(`  ✅ Approved VerseMaster`);
    } else {
      console.log(`  Already approved`);
    }

    // Stake
    const vmAgent = vm.connect(agentWallet);
    const info = await vm.agents(agent.address);
    if (info.staked || info[0]) {
      console.log(`  Already staked`);
    } else {
      const stakeTx = await vmAgent.stake();
      await stakeTx.wait();
      console.log(`  ✅ Staked 1 USDC`);
    }

    const finalBal = await usdc.balanceOf(agent.address);
    console.log(`  Final balance: ${Number(finalBal) / 1e6} USDC\n`);
  }

  // Also approve admin for posting tasks
  const adminAllowance = await usdc.allowance(admin.address, VM_ADDRESS);
  if (adminAllowance < ethers.MaxUint256 / 2n) {
    const appTx = await usdc.approve(VM_ADDRESS, ethers.MaxUint256);
    await appTx.wait();
    console.log("✅ Admin approved VerseMaster for task posting");
  }

  console.log("✅ All agents funded, approved, and staked with real Fuji USDC!");
}

main().catch((err) => {
  console.error("❌ Error:", err.message || err);
  process.exit(1);
});
