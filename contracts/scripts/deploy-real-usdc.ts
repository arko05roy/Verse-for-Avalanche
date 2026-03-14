import { ethers } from "hardhat";

const FUJI_USDC = "0x5425890298aed601595a70AB815c96711a31Bc65";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "AVAX");

  // Deploy VerseMaster with REAL Fuji USDC as payment token, consensusThreshold=2
  const VerseMaster = await ethers.getContractFactory("VerseMaster");
  const verseMaster = await VerseMaster.deploy(FUJI_USDC, 2);
  await verseMaster.waitForDeployment();
  const verseMasterAddress = await verseMaster.getAddress();
  console.log("VerseMaster deployed to:", verseMasterAddress);
  console.log("Payment token (Fuji USDC):", FUJI_USDC);

  console.log("\n--- Update .env ---");
  console.log(`VERSE_MASTER_ADDRESS=${verseMasterAddress}`);
  console.log(`NEXT_PUBLIC_VERSE_MASTER_ADDRESS=${verseMasterAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
