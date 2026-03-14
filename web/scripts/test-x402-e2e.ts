/**
 * End-to-end x402 payment test.
 * Signs a USDC transferWithAuthorization via EIP-3009, submits to the server,
 * which forwards to Ultravioleta DAO facilitator for settlement.
 *
 * Run: npx tsx scripts/test-x402-e2e.ts
 */
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { wrapFetchWithPayment } from "@x402/fetch";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const privateKey = `0x${process.env.ADMIN_PRIVATE_KEY}` as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  console.log("Payer address:", account.address);

  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http(process.env.FUJI_RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: avalancheFuji,
    transport: http(process.env.FUJI_RPC_URL),
  });

  // Check USDC balance
  const usdcAddress = "0x5425890298aed601595a70AB815c96711a31Bc65" as `0x${string}`;
  const balance = await publicClient.readContract({
    address: usdcAddress,
    abi: [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] }],
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log("USDC balance:", Number(balance) / 1e6, "USDC");

  if (Number(balance) < 10000) {
    console.error("ERROR: Need at least 0.01 USDC. Get from https://faucet.circle.com");
    process.exit(1);
  }

  // Build x402 client signer
  const signer = toClientEvmSigner(
    {
      address: account.address,
      async signTypedData(typedData: any) {
        return walletClient.signTypedData(typedData);
      },
    },
    {
      readContract: (args: any) => publicClient.readContract(args),
    }
  );

  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(signer));

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  console.log("\nSending x402 paid POST to /api/task...");
  const res = await fetchWithPayment("http://localhost:3000/api/task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      verseId: "test-x402",
      prompt: "What is the capital of France?",
      bounty: "1",
      poster: account.address,
    }),
  });

  console.log("Response status:", res.status);
  const body = await res.json();
  console.log("Response body:", JSON.stringify(body, null, 2));

  if (res.ok && body.success) {
    console.log("\n✅ x402 payment flow works end-to-end!");
    console.log("Settlement via Ultravioleta DAO facilitator on Avalanche Fuji");
  } else {
    console.log("\n❌ Payment failed. Check facilitator logs.");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
