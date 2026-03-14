import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

// Circle's official test USDC on Avalanche Fuji
const FUJI_USDC_ADDRESS = process.env.FUJI_USDC_ADDRESS || "0x5425890298aed601595a70AB815c96711a31Bc65";
const USDC_DECIMALS = 6;

const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://facilitator.ultravioletadao.xyz",
});

const evmScheme = new ExactEvmScheme();

// Register Fuji USDC since it's not in the default asset list
evmScheme.registerMoneyParser(async (amount: number, network: string) => {
  if (network === "eip155:43113") {
    const tokenAmount = Math.round(amount * 10 ** USDC_DECIMALS);
    return {
      amount: tokenAmount.toString(),
      asset: FUJI_USDC_ADDRESS as `0x${string}`,
    };
  }
  return null;
});

export const x402Server = new x402ResourceServer(facilitatorClient);
x402Server.register("eip155:*", evmScheme);

export const PAYMENT_CONFIG = {
  accepts: [
    {
      scheme: "exact" as const,
      price: "$0.01",
      network: "eip155:43113" as `${string}:${string}`,
      payTo: (process.env.RESOURCE_WALLET_ADDRESS || "0xABaF59180e0209bdB8b3048bFbe64e855074C0c4") as `0x${string}`,
      extra: {
        name: "USD Coin",
        version: "2",
      },
    },
  ],
  description: "Post a task to the VERSE consensus network",
  mimeType: "application/json",
};
