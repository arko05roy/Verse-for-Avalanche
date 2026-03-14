import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "AVAX");

  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy(deployer.address);
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("MockUSDC deployed to:", mockUSDCAddress);

  // Deploy VerseMaster with consensusThreshold=2
  const VerseMaster = await ethers.getContractFactory("VerseMaster");
  const verseMaster = await VerseMaster.deploy(mockUSDCAddress, 2);
  await verseMaster.waitForDeployment();
  const verseMasterAddress = await verseMaster.getAddress();
  console.log("VerseMaster deployed to:", verseMasterAddress);

  console.log("\n--- Copy to .env ---");
  console.log(`MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
  console.log(`VERSE_MASTER_ADDRESS=${verseMasterAddress}`);
  console.log(`NEXT_PUBLIC_MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
  console.log(`NEXT_PUBLIC_VERSE_MASTER_ADDRESS=${verseMasterAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
