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
    console.error("[Polymarket] Failed to fetch markets:", err);
    return [];
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
    console.error("[Polymarket] Search failed:", err);
    return [];
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
