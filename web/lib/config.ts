import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { defineChain } from "viem";

export const avalancheFuji = defineChain({
  id: 43113,
  name: "Avalanche Fuji",
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_FUJI_RPC_URL ||
          "https://api.avax-test.network/ext/bc/C/rpc",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Snowtrace", url: "https://testnet.snowtrace.io" },
  },
  testnet: true,
});

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet, metaMaskWallet],
    },
  ],
  {
    appName: "VERSE",
    projectId: "VERSE_LOCAL",
  }
);

export const config = createConfig({
  connectors,
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: http(),
  },
  ssr: true,
});
