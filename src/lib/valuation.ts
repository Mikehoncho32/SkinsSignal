import { categorize } from "@/lib/category";
import { fetchCSFloatListings } from "@/lib/csfloat";
import type { ItemAggregate } from "@/lib/steam";
import { withClient } from "@/lib/db";

type OverrideRow = { custom_value_usd: number | null } | null;

export async function getOverride(userId: number, itemName: string): Promise<OverrideRow> {
  return await withClient(async (c) => {
    const r = await c.query("SELECT custom_value_usd FROM item_overrides WHERE user_id=$1 AND item_name=$2 LIMIT 1", [userId, itemName]);
    return r.rows[0] || null;
  });
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const a = [...nums].sort((x,y)=>x-y);
  const m = Math.floor(a.length/2);
  return a.length % 2 ? a[m] : (a[m-1]+a[m])/2;
}

export async function valueOneItem(userId: number, item: ItemAggregate) {
  let listings: any[] = [];
  try { listings = await fetchCSFloatListings(item.name); } catch { listings = []; }

  const clean = listings.filter(l => !l.stickers || l.stickers.length === 0 || (l.sticker_premium_pct ?? 0) < 0.02);
  const baseCandidates = clean.length ? clean : listings;
  const prices = baseCandidates.map(l => Number(l.price||0)).filter(n=>n>0);
  const base_price_usd = median(prices);
  const allPrices = listings.map(l => Number(l.price||0)).filter(n=>n>0);
  const marketMin = allPrices.length ? Math.min(...allPrices) : base_price_usd;
  const valued_price_usd_market = Number.isFinite(marketMin) ? marketMin : base_price_usd;

  const sticker_premium_pct = (() => {
    const vals = listings.map(l => Number(l.sticker_premium_pct ?? 0)).filter(n=>n>0);
    return vals.length ? median(vals) : null;
  })();
  const sticker_premium_usd = sticker_premium_pct != null ? base_price_usd * Number(sticker_premium_pct) : null;

  const override = await getOverride(userId, item.name);
  const valued_price_usd_effective = override?.custom_value_usd ?? valued_price_usd_market;
  const override_applied = override?.custom_value_usd != null;

  return {
    name: item.name,
    qty: item.qty,
    category: categorize(item.name),
    base_price_usd,
    sticker_sum_usd: null,
    sticker_premium_pct,
    sticker_premium_usd: sticker_premium_usd ?? null,
    valued_price_usd_market,
    valued_price_usd_effective,
    override_applied,
    float_value: null,
    paint_seed: null,
    stickers_json: null
  };
}
