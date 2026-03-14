# SuperMission AI Agent Building Guide

> Everything you need to build a new AI agent in the SuperMission platform.
> You do NOT need an LLM key from OpenAI/Anthropic — you'll use your **Groq API key** via OpenRouter or directly.

---

## Table of Contents

1. [Environment Variables (from .env)](#1-environment-variables)
2. [Existing Agents Overview](#2-existing-agents)
3. [Architecture & Common Patterns](#3-architecture)
4. [Step-by-Step: Build a New Agent](#4-step-by-step)
5. [External API Keys & Tools](#5-external-api-keys--tools)
6. [Blockchain Interaction](#6-blockchain-interaction)
7. [Key File Locations](#7-key-file-locations)

---

## 1. Environment Variables

### Network & RPC

```
NEXT_PUBLIC_NETWORK=base
NEXT_PUBLIC_CHAIN_ID=8453
BASE_RPC_URL=https://your-quicknode-base-rpc-url
NEXT_PUBLIC_BASE_RPC_URL=https://your-quicknode-base-rpc-url
NEXT_PUBLIC_POLYGON_RPC_URL=https://your-quicknode-polygon-rpc-url
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://your-quicknode-ethereum-rpc-url
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://your-quicknode-arbitrum-rpc-url
NEXT_PUBLIC_BSC_RPC_URL=https://your-quicknode-bsc-rpc-url
QUICKNODE_API_KEY=your_quicknode_api_key
```

### Supabase (Database)

```
NEXT_PUBLIC_SUPABASE_URL=https://fulkoseqnnzqycpxvdsf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Token Analysis APIs

```
NEXT_PUBLIC_COINGECKO_API_KEY=your_coingecko_api_key
COINGECKO_API_KEY=your_coingecko_api_key
NEXT_PUBLIC_GO_PLUS_APP_KEY=your_goplus_app_key
NEXT_PUBLIC_GO_PLUS_APP_SECRET=your_goplus_app_secret
GO_PLUS_APP_KEY=your_goplus_app_key
GO_PLUS_APP_SECRET=your_goplus_app_secret
COINMARKETCAP_API=your_coinmarketcap_api_key
ONE_INCH_API_KEY=your_1inch_api_key
BASESCAN_API_KEY=your_basescan_api_key
ZEROX_API_KEY=your_zerox_api_key
```

### Prediction Market (Polymarket)

```
POLY_BUILDER_API_KEY=your_poly_builder_api_key
POLY_BUILDER_SECRET=your_poly_builder_secret
POLY_BUILDER_PASSPHRASE=your_poly_builder_passphrase
NEXT_PUBLIC_POLY_BUILDER_API_KEY=your_poly_builder_api_key_public
NEXT_PUBLIC_POLY_BUILDER_SECRET=your_poly_builder_secret_public
NEXT_PUBLIC_POLY_BUILDER_PASSPHRASE=your_poly_builder_passphrase_public
```

### IPFS Storage (Pinata)

```
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
PINATA_JWT=your_pinata_jwt
```

### AI Services (replace with your Groq key where needed)

```
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key
DOME_API_KEY=your_dome_api_key
MINIMAX_API_KEY=your_minimax_api_key
```

### Wallets & Deployment

```
PRIVATE_KEY=0xyour_private_key
DEPLOYER_ADDRESS=0x57E94Af6f45fD9Cda508Ee8E6467B2895F75bBF9
NEXT_PUBLIC_ORCHESTRATOR_WALLET_ADDRESS=0x57E94Af6f45fD9Cda508Ee8E6467B2895F75bBF9
TOKEN_DD_AGENT_ADDRESS=0x04401CbB0D26c71870116926932fAeBe75eedF56
TOKEN_DD_AGENT_PRIVATE_KEY=0xyour_token_dd_agent_private_key
FUND_WALLET_PRIVATE_KEY=your_fund_wallet_private_key
NEXT_PUBLIC_FUND_WALLET_ADDRESS=0x4330ceaf1b7e95688f8d65815f72ff50fa3f0cb8
RELAYER_PRIVATE_KEY=0xyour_fund_wallet_private_key
NFT_MINTER_PRIVATE_KEY=0xyour_nft_minter_private_key
```

### Smart Contracts (Base Mainnet)

```
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_SIMPLE_ARBITRATOR_ADDRESS=0x8c6Ea0de95215Dbdc1a3366E1E275925b4731fbf
NEXT_PUBLIC_GIG_ESCROW_ADDRESS=0x8f402EB96d7e76bc850292Ce3cb23E70224b8ef8
NEXT_PUBLIC_BOUNTY_ESCROW_ADDRESS=0x07e1c8aCa82244eDa18D46e54856Bd797307211C
NEXT_PUBLIC_MISSION_ESCROW_ADDRESS=0x52297C4CAf8c43cE9524FCCF70Ab6C86030F006f
NEXT_PUBLIC_ERC8004_REGISTRY_ADDRESS=0x67F30a990bFa8356bFBC261971dA2AcfAF994490
NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=0x2cA9DBEB3D6931c07B0819D446Ee3276F4154cc8
```

### Auth & Other

```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
NEXT_PUBLIC_CDP_API_KEY=your_cdp_api_key
CDP_API_SECRET=your_cdp_api_secret
ENCRYPTION_MASTER_KEY=your_encryption_master_key
CRON_SECRET=your_cron_secret
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/your_onchainkit_api_key
NEXT_PUBLIC_WORKER_URL=https://worker.supermission.fun/
```

---

## 2. Existing Agents

| Agent | Directory | API Route | External APIs |
|-------|-----------|-----------|---------------|
| **Smart Contract Audit** | `lib/new-agents/contractAudit/` | `/api/new-agents/contract-audit` | Solhint, Pashov AI, Nemesis AI |
| **Token Due Diligence** | `lib/new-agents/tokenDueDiligence/` | `/api/new-agents/token-due-diligence` | CoinGecko, 1inch, GoPlus, CoinDesk |
| **Image Generation** | `lib/new-agents/imageGeneration/` | `/api/new-agents/image-generation` | Nano Banana (Gemini), Pinata IPFS |
| **Prediction Market** | `lib/new-agents/polymarketAgent/` | `/api/new-agents/prediction-market` | Polymarket (Polygon) |
| **DeFi Yield Scanner** | (in api route) | `/api/new-agents/defi-yield` | DeFiLlama, OpenRouter LLM |
| **Wallet Intelligence** | `lib/wallet-intelligence/` | `/api/new-agents/wallet-intelligence` | Reservoir, Aave, Uniswap, Compound |
| **Sentiment Aggregation** | `lib/sentiment/` | (internal) | LunarCrush, Santiment, CoinGecko |

---

## 3. Architecture

Every agent follows the same flow:

```
User Request (POST)
    |
    v
API Route (/api/new-agents/{agent-name}/route.ts)
    |
    ├── 1. Validate input (parse body)
    ├── 2. Optional: X402 payment check
    ├── 3. Track job: createSingleAgentJob()
    ├── 4. Execute agent logic (parallel API calls via Promise.allSettled)
    ├── 5. Cache results (Supabase or in-memory)
    ├── 6. Complete job: completeSingleAgentJob()
    └── 7. Return JSON response
```

### Standard Response Shape

```typescript
{
  success: boolean;
  agentId: string;
  agentName: string;
  missionId?: string;
  data: { ... };           // agent-specific payload
  executionTimeMs?: number;
  error?: string;
}
```

### GET handler = health/capabilities metadata

```typescript
export async function GET() {
  return NextResponse.json({
    agent: "your-agent-name",
    version: "1.0.0",
    capabilities: ["feature1", "feature2"],
    pricing: { perRequest: "0.10 USDC" },
    chains: ["base"],
  });
}
```

---

## 4. Step-by-Step: Build a New Agent

### Step 1: Create the agent logic directory

```
lib/new-agents/yourAgent/
├── fetchYourAgent.ts       # Main processor function
├── types.ts                # Request/response types
└── cacheDataHelper.ts      # Optional: caching logic
```

### Step 2: Define types (`types.ts`)

```typescript
export interface YourAgentRequest {
  query: string;           // e.g. token address, wallet, market id
  chain?: string;          // default: "base"
  options?: {
    depth?: "quick" | "deep";
    includeHistory?: boolean;
  };
}

export interface YourAgentResponse {
  summary: string;
  score: number;           // 0-100
  details: Record<string, any>;
  sources: string[];
  timestamp: string;
}
```

### Step 3: Build the processor (`fetchYourAgent.ts`)

```typescript
import { YourAgentRequest, YourAgentResponse } from './types';

export async function fetchYourAgent(
  request: YourAgentRequest
): Promise<YourAgentResponse> {
  const startTime = Date.now();

  // 1. Fetch data from multiple sources IN PARALLEL
  const [sourceA, sourceB, sourceC] = await Promise.allSettled([
    fetchFromCoinGecko(request.query),
    fetchFromGoPlus(request.query),
    fetchFromOnChain(request.query),
  ]);

  // 2. Extract fulfilled results, handle failures gracefully
  const dataA = sourceA.status === 'fulfilled' ? sourceA.value : null;
  const dataB = sourceB.status === 'fulfilled' ? sourceB.value : null;
  const dataC = sourceC.status === 'fulfilled' ? sourceC.value : null;

  // 3. Combine & analyze (optionally call Groq LLM for synthesis)
  const llmAnalysis = await callGroqForAnalysis({
    dataA,
    dataB,
    dataC,
    query: request.query,
  });

  // 4. Build response
  return {
    summary: llmAnalysis.summary,
    score: llmAnalysis.score,
    details: { dataA, dataB, dataC },
    sources: ['coingecko', 'goplus', 'onchain'],
    timestamp: new Date().toISOString(),
  };
}
```

### Step 4: Use Groq as your LLM

Since you're using Groq, call it directly or via OpenRouter:

**Option A: Direct Groq API call**

```typescript
async function callGroqForAnalysis(data: any) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',  // or mixtral-8x7b-32768, gemma2-9b-it
      messages: [
        {
          role: 'system',
          content: 'You are a crypto analysis agent. Analyze the provided data and return JSON with summary (string) and score (0-100).',
        },
        {
          role: 'user',
          content: JSON.stringify(data),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });
  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}
```

**Option B: Via OpenRouter (already configured in project)**

```typescript
// Use the existing OpenRouter client at lib/openrouter/client.ts
// Just set model to a Groq-hosted model:
//   "groq/llama-3.3-70b-versatile"
//   "groq/mixtral-8x7b-32768"
```

### Step 5: Create the API route

Create `app/api/new-agents/your-agent/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fetchYourAgent } from '@/lib/new-agents/yourAgent/fetchYourAgent';
import { createSingleAgentJob, completeSingleAgentJob } from '@/lib/agent-economy/collaborate/singleAgent';

const AGENT_ID = 'your-agent-v1';
const AGENT_NAME = 'Your Agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const startTime = Date.now();

    // Validate
    if (!body.query) {
      return NextResponse.json({ success: false, error: 'Missing query' }, { status: 400 });
    }

    // Track job (optional, for agent economy)
    const jobResult = await createSingleAgentJob({
      agentId: AGENT_ID,
      agentName: AGENT_NAME,
      taskDescription: `Analyze: ${body.query}`,
      requesterAddress: body.walletAddress || 'anonymous',
    });

    // Execute
    const result = await fetchYourAgent(body);

    // Complete job
    if (jobResult?.missionId) {
      await completeSingleAgentJob({
        missionId: jobResult.missionId,
        result: { success: true },
      });
    }

    return NextResponse.json({
      success: true,
      agentId: AGENT_ID,
      agentName: AGENT_NAME,
      missionId: jobResult?.missionId,
      data: result,
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error(`[${AGENT_NAME}] Error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    agent: AGENT_NAME,
    agentId: AGENT_ID,
    version: '1.0.0',
    capabilities: ['analysis', 'scoring'],
    pricing: { perRequest: '0.05 USDC' },
    chains: ['base'],
    status: 'active',
  });
}
```

### Step 6: Wire up to the frontend (optional)

Add your agent to the dashboard tabs in the relevant component, or call it from any page:

```typescript
const res = await fetch('/api/new-agents/your-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '0xTokenAddress', chain: 'base' }),
});
const data = await res.json();
```

---

## 5. External API Keys & Tools

These are the tools/APIs available for building agent processes (no LLM key needed for these):

| Tool | Purpose | Key in .env | Free Tier |
|------|---------|-------------|-----------|
| **CoinGecko** | Token prices, market caps, metadata | `COINGECKO_API_KEY` | Yes (rate limited) |
| **GoPlus** | Token security scanning, honeypot detection | `GO_PLUS_APP_KEY` + `GO_PLUS_APP_SECRET` | Yes |
| **1inch** | DEX aggregation, token prices | `ONE_INCH_API_KEY` | Yes |
| **CoinMarketCap** | Market data, rankings | `COINMARKETCAP_API` | Yes |
| **BaseScan** | Contract verification, tx data | `BASESCAN_API_KEY` | Yes |
| **0x** | DEX quotes, swap routing | `ZEROX_API_KEY` | Yes |
| **Polymarket** | Prediction market data & trading | `POLY_BUILDER_API_KEY` + secret + passphrase | Yes |
| **DeFiLlama** | Yield protocols, TVL, prices | No key needed | Fully free |
| **Pinata** | IPFS file/JSON storage | `PINATA_JWT` | 1GB free |
| **Supabase** | Database, real-time, storage | `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| **QuickNode** | Multi-chain RPC endpoints | `QUICKNODE_API_KEY` | Paid |
| **Privy** | Auth, embedded wallets | `PRIVY_APP_SECRET` | Free tier |

### APIs that DON'T need a key

- **DeFiLlama**: `https://yields.llama.fi/pools` — all yield data
- **Chainlink**: Read price feeds directly from on-chain contracts (just gas)
- **Uniswap/Aave/Compound**: Read contract state via RPC (just gas for writes)

---

## 6. Blockchain Interaction

### Reading on-chain data (Viem)

The project uses Viem clients at `lib/viem/clients.ts`:

```typescript
import { baseClient } from '@/lib/viem/clients';

// Read a token balance
const balance = await baseClient.readContract({
  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  abi: ERC20_ABI,
  functionName: 'balanceOf',
  args: [walletAddress],
});
```

### Writing transactions (GOAT SDK)

```typescript
import { createGoatWallet } from '@/lib/goat/wallet-provider';
import { erc20 } from '@goat-sdk/plugin-erc20';

const wallet = createGoatWallet(walletClient);
const tools = await wallet.with([erc20]);
// Use LLM function calling to execute swaps, transfers, approvals
```

### Server wallets (`lib/server-wallets/`)

- Agent wallets with encrypted private keys (AES-256)
- Daily & per-tx spending limits
- Approval workflows for high-value transactions

---

## 7. Key File Locations

```
supermission_pvt/
├── lib/
│   ├── new-agents/              # ALL agent implementations go here
│   │   ├── contractAudit/       # Smart contract audit agent
│   │   ├── tokenDueDiligence/   # Token DD agent
│   │   ├── imageGeneration/     # Image gen agent
│   │   └── polymarketAgent/     # Prediction market agent
│   ├── agent-economy/           # Agent orchestration & payments
│   │   ├── collaborate/         # createSingleAgentJob, completeSingleAgentJob
│   │   ├── wallet/              # Agent wallet management
│   │   ├── erc8004/             # On-chain registry
│   │   └── x402/                # Payment protocol
│   ├── ai/
│   │   ├── oracle/              # Oracle tools (search_markets, prepare_trade, etc.)
│   │   ├── chat-models.ts       # Model definitions
│   │   └── process-ai-request.ts
│   ├── sentiment/               # Sentiment aggregation
│   ├── wallet-intelligence/     # Wallet analysis
│   ├── goat/                    # GOAT SDK blockchain interaction
│   ├── viem/                    # RPC clients (base, polygon, ethereum)
│   ├── openrouter/              # LLM client (use for Groq models via OpenRouter)
│   ├── server-wallets/          # Encrypted agent wallets
│   └── supabase/                # DB client
├── app/api/
│   ├── new-agents/              # Agent API routes
│   │   ├── contract-audit/
│   │   ├── token-due-diligence/
│   │   ├── image-generation/
│   │   ├── prediction-market/
│   │   ├── defi-yield/
│   │   ├── wallet-intelligence/
│   │   └── defi-agent/
│   └── agents/                  # Agent registry endpoints
├── worker/                      # Price feed & market data worker
│   └── src/
│       ├── index.ts             # Express server (port 3001)
│       ├── priceFeed.ts         # Real-time price streaming
│       ├── newsService.ts       # News aggregation
│       └── fetchMarket.ts       # Polymarket data refresh
└── workers/                     # Cloudflare Workers
    ├── negotiation/
    ├── payments/
    └── webhooks/
```

---

## Quick Checklist: New Agent

1. [ ] Create `lib/new-agents/yourAgent/` with `types.ts` and `fetchYourAgent.ts`
2. [ ] Add your Groq API key to `.env`: `GROQ_API_KEY=gsk_...`
3. [ ] Build data-fetching functions for your external APIs (CoinGecko, GoPlus, DeFiLlama, etc.)
4. [ ] Use `Promise.allSettled()` for parallel API calls
5. [ ] Optionally call Groq for LLM synthesis/analysis
6. [ ] Create API route at `app/api/new-agents/your-agent/route.ts`
7. [ ] Add GET handler for health/capabilities metadata
8. [ ] Integrate with agent economy via `createSingleAgentJob` / `completeSingleAgentJob`
9. [ ] Add caching layer if needed (Supabase or in-memory)
10. [ ] Wire up to frontend dashboard
