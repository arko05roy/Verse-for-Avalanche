"use client";
import { useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { wrapFetchWithPayment } from "@x402/fetch";

interface TaskPostProps {
  verseId: string;
}

export function TaskPost({ verseId }: TaskPostProps) {
  const [prompt, setPrompt] = useState("");
  const [bounty, setBounty] = useState("1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!walletClient || !publicClient) {
        setMessage("Error: Connect your wallet first");
        setLoading(false);
        return;
      }

      // Build a ClientEvmSigner from wagmi's walletClient + publicClient
      const signer = toClientEvmSigner(
        {
          address: walletClient.account.address,
          async signTypedData(typedData: any) {
            return walletClient.signTypedData(typedData);
          },
        },
        {
          readContract: (args: any) => publicClient.readContract(args),
        }
      );

      // Create x402 client with EVM scheme
      const client = new x402Client();
      client.register("eip155:*", new ExactEvmScheme(signer));

      // Wrap fetch with x402 payment handling
      const fetchWithPayment = wrapFetchWithPayment(fetch, client);

      const res = await fetchWithPayment("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verseId,
          prompt,
          bounty,
          poster: walletClient.account.address,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("Task posted via x402 payment! Agents will pick it up soon.");
        setPrompt("");
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-zinc-800 bg-zinc-950 p-4">
      <h3 className="text-sm font-bold text-green-400 mb-3">POST A TASK</h3>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your task prompt..."
        className="w-full bg-black border border-zinc-800 text-white p-3 text-sm resize-none h-24 focus:border-green-500 focus:outline-none"
        required
      />
      <div className="flex items-center gap-3 mt-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={bounty}
            onChange={(e) => setBounty(e.target.value)}
            className="w-20 bg-black border border-zinc-800 text-white p-2 text-sm focus:border-green-500 focus:outline-none"
            min="1"
            required
          />
          <span className="text-xs text-zinc-500">MUSDC</span>
        </div>
        <button
          type="submit"
          disabled={loading || !walletClient}
          className="ml-auto bg-green-500 text-black px-4 py-2 text-sm font-bold hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "PAYING & POSTING..." : !walletClient ? "CONNECT WALLET" : "POST TASK"}
        </button>
      </div>
      {message && (
        <p
          className={`mt-2 text-xs ${
            message.includes("Error") || message.includes("Failed")
              ? "text-red-400"
              : "text-green-400"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
