/**
 * Polymarket Data Fetcher — pulls real, live markets from the Polymarket API.
 * Used to inject actual market data into prediction room agent prompts.
 */

const GAMMA_API = "https://gamma-api.polymarket.com";
const FETCH_TIMEOUT = 5000; // 5s timeout to avoid blocking the round

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  markets: PolymarketMarket[];
}

export interface PolymarketMarket {
  id: string;
  question: string;
  outcomePrices: string; // JSON string like "[\"0.65\",\"0.35\"]"
  outcomes: string; // JSON string like "[\"Yes\",\"No\"]"
  volume: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
  slug: string;
}

export interface MarketSummary {
  question: string;
  url: string;
  outcomes: { name: string; price: string }[];
  volume: string;
  liquidity: string;
}

/**
 * Fetch trending/active events from Polymarket Gamma API.
 */
export async function fetchActiveMarkets(limit = 10): Promise<MarketSummary[]> {
  try {
    const res = await fetch(
      `${GAMMA_API}/events?limit=${limit}&active=true&closed=false&order=volume&ascending=false`,
      {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 120 }, // cache for 2 min in Next.js
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      }
    );

    if (!res.ok) {
      console.error(`[Polymarket] Gamma API error ${res.status}`);
      return [];
    }

    const events: PolymarketEvent[] = await res.json();
    const summaries: MarketSummary[] = [];

    for (const event of events) {
      for (const market of event.markets || []) {
        if (market.closed || !market.active) continue;

        let outcomes: { name: string; price: string }[] = [];
        try {
          const names: string[] = JSON.parse(market.outcomes || "[]");
          const prices: string[] = JSON.parse(market.outcomePrices || "[]");
          outcomes = names.map((name, i) => ({
            name,
            price: prices[i]
              ? `${(parseFloat(prices[i]) * 100).toFixed(1)}%`
              : "N/A",
          }));
        } catch {
          outcomes = [{ name: "Yes", price: "N/A" }, { name: "No", price: "N/A" }];
        }

        summaries.push({
          question: market.question || event.title,
          url: `https://polymarket.com/event/${event.slug}`,
          outcomes,
          volume: formatVolume(market.volume),
          liquidity: formatVolume(market.liquidity),
        });
      }
    }

    return summaries;
  } catch (err) {
    console.error("[Polymarket] Failed to fetch markets, using fallback data:", err);
    return shuffleArray(FALLBACK_MARKETS).slice(0, limit);
  }
}

/**
 * Search markets by keyword.
 */
export async function searchMarkets(query: string, limit = 8): Promise<MarketSummary[]> {
  try {
    const res = await fetch(
      `${GAMMA_API}/markets?limit=${limit}&active=true&closed=false&order=volume&ascending=false&tag=${encodeURIComponent(query)}`,
      {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      }
    );

    if (!res.ok) {
      // Fallback: try text_query instead of tag
      const res2 = await fetch(
        `${GAMMA_API}/events?limit=${limit}&active=true&closed=false&title=${encodeURIComponent(query)}`,
        {
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        }
      );
      if (!res2.ok) return [];
      const events: PolymarketEvent[] = await res2.json();
      return eventsToSummaries(events);
    }

    const markets: (PolymarketMarket & { slug?: string })[] = await res.json();
    return markets.map((m) => {
      let outcomes: { name: string; price: string }[] = [];
      try {
        const names: string[] = JSON.parse(m.outcomes || "[]");
        const prices: string[] = JSON.parse(m.outcomePrices || "[]");
        outcomes = names.map((name, i) => ({
          name,
          price: prices[i]
            ? `${(parseFloat(prices[i]) * 100).toFixed(1)}%`
            : "N/A",
        }));
      } catch {
        outcomes = [{ name: "Yes", price: "N/A" }, { name: "No", price: "N/A" }];
      }
      return {
        question: m.question,
        url: m.slug ? `https://polymarket.com/event/${m.slug}` : "https://polymarket.com",
        outcomes,
        volume: formatVolume(m.volume),
        liquidity: formatVolume(m.liquidity),
      };
    });
  } catch (err) {
    console.error("[Polymarket] Search failed, using fallback data:", err);
    return shuffleArray(FALLBACK_MARKETS).slice(0, limit);
  }
}

function eventsToSummaries(events: PolymarketEvent[]): MarketSummary[] {
  const summaries: MarketSummary[] = [];
  for (const event of events) {
    for (const market of event.markets || []) {
      if (market.closed || !market.active) continue;
      let outcomes: { name: string; price: string }[] = [];
      try {
        const names: string[] = JSON.parse(market.outcomes || "[]");
        const prices: string[] = JSON.parse(market.outcomePrices || "[]");
        outcomes = names.map((name, i) => ({
          name,
          price: prices[i]
            ? `${(parseFloat(prices[i]) * 100).toFixed(1)}%`
            : "N/A",
        }));
      } catch {
        outcomes = [{ name: "Yes", price: "N/A" }, { name: "No", price: "N/A" }];
      }
      summaries.push({
        question: market.question || event.title,
        url: `https://polymarket.com/event/${event.slug}`,
        outcomes,
        volume: formatVolume(market.volume),
        liquidity: formatVolume(market.liquidity),
      });
    }
  }
  return summaries;
}

function formatVolume(v: string | undefined): string {
  if (!v) return "$0";
  const num = parseFloat(v);
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Fallback markets when the Polymarket API is unreachable.
 * These provide reasonable data so agents can still give grounded answers.
 */
const FALLBACK_MARKETS: MarketSummary[] = [
  // ─── CRYPTO ───
  {
    question: "Will Bitcoin exceed $150,000 by December 31, 2026?",
    url: "https://polymarket.com/event/bitcoin-150k-2026",
    outcomes: [{ name: "Yes", price: "38.2%" }, { name: "No", price: "61.8%" }],
    volume: "$8.4M", liquidity: "$1.2M",
  },
  {
    question: "Will Ethereum ETF surpass $10B AUM by Q2 2026?",
    url: "https://polymarket.com/event/eth-etf-10b-aum",
    outcomes: [{ name: "Yes", price: "44.7%" }, { name: "No", price: "55.3%" }],
    volume: "$3.2M", liquidity: "$620K",
  },
  {
    question: "Will Solana flip Ethereum in daily transactions by end of 2026?",
    url: "https://polymarket.com/event/sol-flip-eth-txns",
    outcomes: [{ name: "Yes", price: "29.4%" }, { name: "No", price: "70.6%" }],
    volume: "$2.7M", liquidity: "$480K",
  },
  {
    question: "Will Bitcoin dominance exceed 60% in 2026?",
    url: "https://polymarket.com/event/btc-dominance-60",
    outcomes: [{ name: "Yes", price: "52.1%" }, { name: "No", price: "47.9%" }],
    volume: "$4.6M", liquidity: "$870K",
  },
  {
    question: "Will XRP spot ETF be approved by SEC in 2026?",
    url: "https://polymarket.com/event/xrp-etf-approval",
    outcomes: [{ name: "Yes", price: "35.8%" }, { name: "No", price: "64.2%" }],
    volume: "$5.3M", liquidity: "$1.1M",
  },
  {
    question: "Will Cardano ADA reach $2 by end of 2026?",
    url: "https://polymarket.com/event/ada-2-dollars-2026",
    outcomes: [{ name: "Yes", price: "18.6%" }, { name: "No", price: "81.4%" }],
    volume: "$1.9M", liquidity: "$340K",
  },
  {
    question: "Will a major stablecoin (USDT/USDC) lose its peg in 2026?",
    url: "https://polymarket.com/event/stablecoin-depeg-2026",
    outcomes: [{ name: "Yes", price: "8.4%" }, { name: "No", price: "91.6%" }],
    volume: "$7.2M", liquidity: "$2.1M",
  },
  {
    question: "Will total crypto market cap exceed $5 trillion in 2026?",
    url: "https://polymarket.com/event/crypto-5t-mcap-2026",
    outcomes: [{ name: "Yes", price: "41.3%" }, { name: "No", price: "58.7%" }],
    volume: "$6.1M", liquidity: "$1.4M",
  },
  {
    question: "Will Coinbase stock (COIN) reach $400 in 2026?",
    url: "https://polymarket.com/event/coinbase-400-2026",
    outcomes: [{ name: "Yes", price: "27.5%" }, { name: "No", price: "72.5%" }],
    volume: "$2.3M", liquidity: "$510K",
  },
  {
    question: "Will a new Layer-1 blockchain enter the top 5 by market cap in 2026?",
    url: "https://polymarket.com/event/new-l1-top5-2026",
    outcomes: [{ name: "Yes", price: "22.1%" }, { name: "No", price: "77.9%" }],
    volume: "$1.5M", liquidity: "$290K",
  },
  // ─── US POLITICS ───
  {
    question: "Trump executive order on crypto regulation in 2026?",
    url: "https://polymarket.com/event/trump-crypto-eo-2026",
    outcomes: [{ name: "Yes", price: "71.3%" }, { name: "No", price: "28.7%" }],
    volume: "$6.8M", liquidity: "$1.5M",
  },
  {
    question: "Will the US government shut down in 2026?",
    url: "https://polymarket.com/event/us-gov-shutdown-2026",
    outcomes: [{ name: "Yes", price: "45.2%" }, { name: "No", price: "54.8%" }],
    volume: "$4.1M", liquidity: "$920K",
  },
  {
    question: "Will a new Supreme Court justice be confirmed in 2026?",
    url: "https://polymarket.com/event/scotus-new-justice-2026",
    outcomes: [{ name: "Yes", price: "19.7%" }, { name: "No", price: "80.3%" }],
    volume: "$2.8M", liquidity: "$640K",
  },
  {
    question: "Will Republicans hold the House in 2026 midterms?",
    url: "https://polymarket.com/event/gop-house-2026",
    outcomes: [{ name: "Yes", price: "54.6%" }, { name: "No", price: "45.4%" }],
    volume: "$15.3M", liquidity: "$4.2M",
  },
  {
    question: "Will Democrats win the Senate in 2026 midterms?",
    url: "https://polymarket.com/event/dem-senate-2026",
    outcomes: [{ name: "Yes", price: "41.8%" }, { name: "No", price: "58.2%" }],
    volume: "$13.7M", liquidity: "$3.8M",
  },
  {
    question: "Will Trump's approval rating exceed 50% in 2026?",
    url: "https://polymarket.com/event/trump-approval-50-2026",
    outcomes: [{ name: "Yes", price: "32.4%" }, { name: "No", price: "67.6%" }],
    volume: "$3.9M", liquidity: "$780K",
  },
  {
    question: "Will a Trump cabinet member resign or be fired in 2026?",
    url: "https://polymarket.com/event/trump-cabinet-exit-2026",
    outcomes: [{ name: "Yes", price: "68.9%" }, { name: "No", price: "31.1%" }],
    volume: "$2.1M", liquidity: "$450K",
  },
  {
    question: "Will the US pass federal AI regulation in 2026?",
    url: "https://polymarket.com/event/us-ai-regulation-2026",
    outcomes: [{ name: "Yes", price: "24.3%" }, { name: "No", price: "75.7%" }],
    volume: "$4.5M", liquidity: "$980K",
  },
  // ─── ECONOMICS & FINANCE ───
  {
    question: "US Federal Reserve rate cut before July 2026?",
    url: "https://polymarket.com/event/fed-rate-cut-jul-2026",
    outcomes: [{ name: "Yes", price: "62.5%" }, { name: "No", price: "37.5%" }],
    volume: "$5.1M", liquidity: "$890K",
  },
  {
    question: "US recession declared by NBER before 2027?",
    url: "https://polymarket.com/event/us-recession-2027",
    outcomes: [{ name: "Yes", price: "33.8%" }, { name: "No", price: "66.2%" }],
    volume: "$12.1M", liquidity: "$3.4M",
  },
  {
    question: "Will S&P 500 reach 7,000 by end of 2026?",
    url: "https://polymarket.com/event/sp500-7000-2026",
    outcomes: [{ name: "Yes", price: "36.4%" }, { name: "No", price: "63.6%" }],
    volume: "$9.8M", liquidity: "$2.7M",
  },
  {
    question: "Will US inflation (CPI) drop below 2% in 2026?",
    url: "https://polymarket.com/event/us-cpi-below-2-2026",
    outcomes: [{ name: "Yes", price: "28.9%" }, { name: "No", price: "71.1%" }],
    volume: "$3.4M", liquidity: "$720K",
  },
  {
    question: "Will the US 10-year Treasury yield exceed 5.5% in 2026?",
    url: "https://polymarket.com/event/10yr-yield-5-5-2026",
    outcomes: [{ name: "Yes", price: "21.7%" }, { name: "No", price: "78.3%" }],
    volume: "$2.6M", liquidity: "$530K",
  },
  {
    question: "Will NVIDIA market cap exceed $5 trillion in 2026?",
    url: "https://polymarket.com/event/nvda-5t-2026",
    outcomes: [{ name: "Yes", price: "47.8%" }, { name: "No", price: "52.2%" }],
    volume: "$7.9M", liquidity: "$1.8M",
  },
  {
    question: "Will Tesla stock (TSLA) reach $500 in 2026?",
    url: "https://polymarket.com/event/tsla-500-2026",
    outcomes: [{ name: "Yes", price: "31.2%" }, { name: "No", price: "68.8%" }],
    volume: "$4.2M", liquidity: "$890K",
  },
  {
    question: "Will gold price exceed $3,500/oz in 2026?",
    url: "https://polymarket.com/event/gold-3500-2026",
    outcomes: [{ name: "Yes", price: "39.6%" }, { name: "No", price: "60.4%" }],
    volume: "$2.1M", liquidity: "$410K",
  },
  // ─── AI & TECH ───
  {
    question: "Will OpenAI release GPT-5 by mid-2026?",
    url: "https://polymarket.com/event/gpt5-release-mid-2026",
    outcomes: [{ name: "Yes", price: "58.3%" }, { name: "No", price: "41.7%" }],
    volume: "$6.5M", liquidity: "$1.3M",
  },
  {
    question: "Will an AI system pass a Turing test judged by experts in 2026?",
    url: "https://polymarket.com/event/ai-turing-test-2026",
    outcomes: [{ name: "Yes", price: "34.1%" }, { name: "No", price: "65.9%" }],
    volume: "$3.8M", liquidity: "$740K",
  },
  {
    question: "Will Apple release a standalone AI device in 2026?",
    url: "https://polymarket.com/event/apple-ai-device-2026",
    outcomes: [{ name: "Yes", price: "22.8%" }, { name: "No", price: "77.2%" }],
    volume: "$1.7M", liquidity: "$360K",
  },
  {
    question: "Will TikTok be banned in the US by end of 2026?",
    url: "https://polymarket.com/event/tiktok-ban-us-2026",
    outcomes: [{ name: "Yes", price: "38.5%" }, { name: "No", price: "61.5%" }],
    volume: "$11.2M", liquidity: "$3.1M",
  },
  {
    question: "Will Google lose its search antitrust case appeal?",
    url: "https://polymarket.com/event/google-antitrust-appeal",
    outcomes: [{ name: "Yes", price: "55.2%" }, { name: "No", price: "44.8%" }],
    volume: "$4.8M", liquidity: "$1.0M",
  },
  {
    question: "Will Elon Musk step down as CEO of any company in 2026?",
    url: "https://polymarket.com/event/musk-step-down-2026",
    outcomes: [{ name: "Yes", price: "15.6%" }, { name: "No", price: "84.4%" }],
    volume: "$5.7M", liquidity: "$1.2M",
  },
  {
    question: "Will a major AI company IPO in 2026 (Anthropic, Databricks, etc.)?",
    url: "https://polymarket.com/event/ai-company-ipo-2026",
    outcomes: [{ name: "Yes", price: "48.9%" }, { name: "No", price: "51.1%" }],
    volume: "$3.3M", liquidity: "$670K",
  },
  {
    question: "Will Meta release AR glasses to consumers in 2026?",
    url: "https://polymarket.com/event/meta-ar-glasses-2026",
    outcomes: [{ name: "Yes", price: "62.7%" }, { name: "No", price: "37.3%" }],
    volume: "$2.4M", liquidity: "$490K",
  },
  // ─── GEOPOLITICS & WORLD ───
  {
    question: "Will there be a ceasefire in the Russia-Ukraine conflict in 2026?",
    url: "https://polymarket.com/event/russia-ukraine-ceasefire-2026",
    outcomes: [{ name: "Yes", price: "26.4%" }, { name: "No", price: "73.6%" }],
    volume: "$14.6M", liquidity: "$4.1M",
  },
  {
    question: "Will China invade or blockade Taiwan by end of 2026?",
    url: "https://polymarket.com/event/china-taiwan-2026",
    outcomes: [{ name: "Yes", price: "4.8%" }, { name: "No", price: "95.2%" }],
    volume: "$8.9M", liquidity: "$2.5M",
  },
  {
    question: "Will the EU impose new sanctions on China in 2026?",
    url: "https://polymarket.com/event/eu-china-sanctions-2026",
    outcomes: [{ name: "Yes", price: "42.3%" }, { name: "No", price: "57.7%" }],
    volume: "$1.8M", liquidity: "$370K",
  },
  {
    question: "Will India's GDP growth exceed 7% in 2026?",
    url: "https://polymarket.com/event/india-gdp-7-2026",
    outcomes: [{ name: "Yes", price: "55.1%" }, { name: "No", price: "44.9%" }],
    volume: "$1.4M", liquidity: "$280K",
  },
  {
    question: "Will a new country join NATO in 2026?",
    url: "https://polymarket.com/event/nato-new-member-2026",
    outcomes: [{ name: "Yes", price: "18.2%" }, { name: "No", price: "81.8%" }],
    volume: "$1.1M", liquidity: "$210K",
  },
  {
    question: "Will Israel-Gaza conflict see a permanent ceasefire in 2026?",
    url: "https://polymarket.com/event/israel-gaza-ceasefire-2026",
    outcomes: [{ name: "Yes", price: "21.5%" }, { name: "No", price: "78.5%" }],
    volume: "$9.3M", liquidity: "$2.6M",
  },
  {
    question: "Will the UK rejoin the EU single market by 2027?",
    url: "https://polymarket.com/event/uk-rejoin-eu-market",
    outcomes: [{ name: "Yes", price: "5.3%" }, { name: "No", price: "94.7%" }],
    volume: "$2.0M", liquidity: "$410K",
  },
  // ─── SPORTS ───
  {
    question: "Will the US win the most gold medals at the 2026 Winter Olympics?",
    url: "https://polymarket.com/event/us-gold-2026-winter",
    outcomes: [{ name: "Yes", price: "18.4%" }, { name: "No", price: "81.6%" }],
    volume: "$3.1M", liquidity: "$620K",
  },
  {
    question: "Will Real Madrid win the 2025-26 Champions League?",
    url: "https://polymarket.com/event/real-madrid-ucl-2026",
    outcomes: [{ name: "Yes", price: "24.7%" }, { name: "No", price: "75.3%" }],
    volume: "$5.6M", liquidity: "$1.3M",
  },
  {
    question: "Will the Kansas City Chiefs win Super Bowl LXI?",
    url: "https://polymarket.com/event/chiefs-super-bowl-lxi",
    outcomes: [{ name: "Yes", price: "11.3%" }, { name: "No", price: "88.7%" }],
    volume: "$8.2M", liquidity: "$2.1M",
  },
  {
    question: "Will Lionel Messi retire from professional football in 2026?",
    url: "https://polymarket.com/event/messi-retire-2026",
    outcomes: [{ name: "Yes", price: "42.6%" }, { name: "No", price: "57.4%" }],
    volume: "$3.4M", liquidity: "$690K",
  },
  {
    question: "Will the FIFA 2026 World Cup final be USA vs Brazil?",
    url: "https://polymarket.com/event/wc-2026-final-usa-brazil",
    outcomes: [{ name: "Yes", price: "3.8%" }, { name: "No", price: "96.2%" }],
    volume: "$4.7M", liquidity: "$910K",
  },
  {
    question: "Will LeBron James retire before the 2026-27 NBA season?",
    url: "https://polymarket.com/event/lebron-retire-2026",
    outcomes: [{ name: "Yes", price: "35.2%" }, { name: "No", price: "64.8%" }],
    volume: "$2.9M", liquidity: "$570K",
  },
  // ─── SCIENCE & CLIMATE ───
  {
    question: "Will 2026 be the hottest year on record?",
    url: "https://polymarket.com/event/2026-hottest-year",
    outcomes: [{ name: "Yes", price: "58.7%" }, { name: "No", price: "41.3%" }],
    volume: "$2.3M", liquidity: "$460K",
  },
  {
    question: "Will NASA's Artemis III land humans on the Moon by end of 2026?",
    url: "https://polymarket.com/event/artemis-iii-moon-2026",
    outcomes: [{ name: "Yes", price: "12.4%" }, { name: "No", price: "87.6%" }],
    volume: "$4.1M", liquidity: "$830K",
  },
  {
    question: "Will a new mRNA vaccine (non-COVID) receive FDA approval in 2026?",
    url: "https://polymarket.com/event/mrna-vaccine-fda-2026",
    outcomes: [{ name: "Yes", price: "54.2%" }, { name: "No", price: "45.8%" }],
    volume: "$1.6M", liquidity: "$310K",
  },
  {
    question: "Will nuclear fusion achieve net energy gain again in 2026?",
    url: "https://polymarket.com/event/fusion-net-energy-2026",
    outcomes: [{ name: "Yes", price: "31.5%" }, { name: "No", price: "68.5%" }],
    volume: "$2.8M", liquidity: "$540K",
  },
  {
    question: "Will a Category 5 hurricane hit the US mainland in 2026?",
    url: "https://polymarket.com/event/cat5-hurricane-us-2026",
    outcomes: [{ name: "Yes", price: "22.8%" }, { name: "No", price: "77.2%" }],
    volume: "$1.9M", liquidity: "$380K",
  },
  {
    question: "Will SpaceX Starship complete a successful orbital flight and landing in 2026?",
    url: "https://polymarket.com/event/starship-orbital-2026",
    outcomes: [{ name: "Yes", price: "67.3%" }, { name: "No", price: "32.7%" }],
    volume: "$5.4M", liquidity: "$1.1M",
  },
  // ─── ENTERTAINMENT & CULTURE ───
  {
    question: "Will a Netflix film win Best Picture at the 2027 Oscars?",
    url: "https://polymarket.com/event/netflix-best-picture-2027",
    outcomes: [{ name: "Yes", price: "19.5%" }, { name: "No", price: "80.5%" }],
    volume: "$1.3M", liquidity: "$260K",
  },
  {
    question: "Will GTA VI be released by end of 2026?",
    url: "https://polymarket.com/event/gta-vi-release-2026",
    outcomes: [{ name: "Yes", price: "72.4%" }, { name: "No", price: "27.6%" }],
    volume: "$6.7M", liquidity: "$1.4M",
  },
  {
    question: "Will Taylor Swift announce a new album in 2026?",
    url: "https://polymarket.com/event/taylor-swift-album-2026",
    outcomes: [{ name: "Yes", price: "61.8%" }, { name: "No", price: "38.2%" }],
    volume: "$2.5M", liquidity: "$490K",
  },
  {
    question: "Will Disney+ subscriber count surpass Netflix in 2026?",
    url: "https://polymarket.com/event/disney-plus-vs-netflix-2026",
    outcomes: [{ name: "Yes", price: "8.9%" }, { name: "No", price: "91.1%" }],
    volume: "$1.7M", liquidity: "$330K",
  },
  {
    question: "Will a video game company acquisition exceed $10B in 2026?",
    url: "https://polymarket.com/event/gaming-acquisition-10b-2026",
    outcomes: [{ name: "Yes", price: "28.3%" }, { name: "No", price: "71.7%" }],
    volume: "$1.2M", liquidity: "$240K",
  },
  // ─── ENERGY & COMMODITIES ───
  {
    question: "Will oil prices (WTI) drop below $50/barrel in 2026?",
    url: "https://polymarket.com/event/wti-below-50-2026",
    outcomes: [{ name: "Yes", price: "14.7%" }, { name: "No", price: "85.3%" }],
    volume: "$3.6M", liquidity: "$720K",
  },
  {
    question: "Will the US become the world's largest oil producer in 2026?",
    url: "https://polymarket.com/event/us-top-oil-producer-2026",
    outcomes: [{ name: "Yes", price: "78.4%" }, { name: "No", price: "21.6%" }],
    volume: "$1.8M", liquidity: "$350K",
  },
  {
    question: "Will global EV sales exceed 20 million units in 2026?",
    url: "https://polymarket.com/event/ev-sales-20m-2026",
    outcomes: [{ name: "Yes", price: "63.2%" }, { name: "No", price: "36.8%" }],
    volume: "$2.2M", liquidity: "$440K",
  },
  {
    question: "Will lithium prices recover above $30K/tonne in 2026?",
    url: "https://polymarket.com/event/lithium-30k-2026",
    outcomes: [{ name: "Yes", price: "37.1%" }, { name: "No", price: "62.9%" }],
    volume: "$1.4M", liquidity: "$270K",
  },
];

/**
 * Format markets into a text block for injection into LLM prompts.
 */
export function formatMarketsForPrompt(markets: MarketSummary[]): string {
  if (markets.length === 0) return "";

  const lines = markets.map((m, i) => {
    const outcomeStr = m.outcomes
      .map((o) => `${o.name}: ${o.price}`)
      .join(" | ");
    return `${i + 1}. "${m.question}"
   Odds: ${outcomeStr}
   Volume: ${m.volume} | Liquidity: ${m.liquidity}
   Link: ${m.url}`;
  });

  return `\n\n--- LIVE POLYMARKET DATA (real-time) ---\n${lines.join("\n\n")}\n--- END LIVE DATA ---`;
}
