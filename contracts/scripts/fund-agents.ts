import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Admin:", admin.address);

  const mockUSDC = await ethers.getContractAt("MockUSDC", process.env.MOCK_USDC_ADDRESS!);
  const verseMasterAddress = process.env.VERSE_MASTER_ADDRESS!;

  const agents = [
    { name: "Agent1", address: process.env.AGENT1_ADDRESS!, key: process.env.AGENT1_PRIVATE_KEY! },
    { name: "Agent2", address: process.env.AGENT2_ADDRESS!, key: process.env.AGENT2_PRIVATE_KEY! },
    { name: "Agent3", address: process.env.AGENT3_ADDRESS!, key: process.env.AGENT3_PRIVATE_KEY! },
  ];

  for (const agent of agents) {
    console.log(`\nFunding ${agent.name} (${agent.address})...`);

    // Send 0.1 AVAX
    const tx = await admin.sendTransaction({
      to: agent.address,
      value: ethers.parseEther("0.1"),
    });
    await tx.wait();
    console.log(`  Sent 0.1 AVAX`);

    // Mint 10 MockUSDC (6 decimals)
    const mintTx = await mockUSDC.mint(agent.address, 10_000_000);
    await mintTx.wait();
    console.log(`  Minted 10 MUSDC`);

    // Approve VerseMaster as agent
    const agentWallet = new ethers.Wallet(agent.key, ethers.provider);
    const agentUSDC = mockUSDC.connect(agentWallet);
    const approveTx = await agentUSDC.approve(verseMasterAddress, ethers.MaxUint256);
    await approveTx.wait();
    console.log(`  Approved VerseMaster`);
  }

  // Also mint some MUSDC to admin for posting tasks
  const adminMintTx = await mockUSDC.mint(admin.address, 100_000_000);
  await adminMintTx.wait();
  console.log("\nMinted 100 MUSDC to admin for task posting");

  // Admin approve VerseMaster too
  const adminApproveTx = await mockUSDC.approve(verseMasterAddress, ethers.MaxUint256);
  await adminApproveTx.wait();
  console.log("Admin approved VerseMaster");

  // Print balances
  console.log("\n--- Final Balances ---");
  for (const agent of agents) {
    const avax = await ethers.provider.getBalance(agent.address);
    const usdc = await mockUSDC.balanceOf(agent.address);
    console.log(`${agent.name}: ${ethers.formatEther(avax)} AVAX, ${Number(usdc) / 1e6} MUSDC`);
  }
  const adminAvax = await ethers.provider.getBalance(admin.address);
  const adminUsdc = await mockUSDC.balanceOf(admin.address);
  console.log(`Admin: ${ethers.formatEther(adminAvax)} AVAX, ${Number(adminUsdc) / 1e6} MUSDC`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
