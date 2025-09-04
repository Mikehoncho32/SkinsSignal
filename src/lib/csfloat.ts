import { getEnv } from "@/lib/env";

type Listing = { price?: number; stickers?: any[]; sticker_premium_pct?: number; float?: number; paintseed?: number; };

const cache = new Map<string, { t: number; v: Listing[] }>();
const TTL = 90_000;

export async function fetchCSFloatListings(market_hash_name: string): Promise<Listing[]> {
  const key = market_hash_name.toLowerCase();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.t < TTL) return hit.v;

  const env = getEnv();
  const url = `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(market_hash_name)}`;
  const res = await fetch(url, { headers: { "x-api-key": env.CSFLOAT_API_KEY }, cache: "no-store" });
  if (!res.ok) throw new Error(`CSFloat listings failed (${res.status})`);
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
  cache.set(key, { t: now, v: results });
  return results as Listing[];
}

export function ladderSpread(listings: Listing[]): number {
  const prices = listings.map(l => Number(l.price||0)).filter(n=>n>0).sort((a,b)=>a-b);
  if (prices.length < 2) return 0;
  return (prices[1] - prices[0]) / prices[0];
}
