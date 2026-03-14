import { ethers } from "hardhat";

async function main() {
  const names = ["AGENT1", "AGENT2", "AGENT3"];
  console.log("--- Copy to .env ---\n");
  for (const name of names) {
    const wallet = ethers.Wallet.createRandom();
    console.log(`${name}_PRIVATE_KEY=${wallet.privateKey.slice(2)}`);
    console.log(`${name}_ADDRESS=${wallet.address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
