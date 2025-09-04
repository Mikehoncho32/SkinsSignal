import { fetchCSFloatListings, ladderSpread } from "@/lib/csfloat";
import { withClient } from "@/lib/db";

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

async function lastTwoSnapshotsItem(userId: number, itemName: string) {
  return await withClient(async (c) => {
    const snaps = await c.query("SELECT id,taken_at FROM inventory_snapshots WHERE user_id=$1 ORDER BY taken_at DESC LIMIT 30", [userId]);
    if (!snaps.rowCount) return [];
    const ids = snaps.rows.map((r:any)=>r.id);
    const rows = await c.query(
      "SELECT s.snapshot_id, i.name, i.qty, i.valued_price_usd_effective FROM item_snapshots i JOIN (SELECT unnest($1::bigint[]) AS snapshot_id) s ON i.snapshot_id=s.snapshot_id WHERE i.name=$2",
      [ids, itemName]
    );
    // Aggregate value per snapshot
    const map = new Map<number, number>();
    for (const r of rows.rows) {
      const sid = Number(r.snapshot_id);
      const val = Number(r.qty) * Number(r.valued_price_usd_effective || 0);
      map.set(sid, (map.get(sid) || 0) + val);
    }
    // return ordered by snapshot order
    const ordered = ids.map(id => map.get(id) || 0);
    return ordered;
  });
}

export async function computeSaleScore(userId: number, itemName: string) {
  // Momentum 7d ~ last vs mean(prev)
  const series = await lastTwoSnapshotsItem(userId, itemName);
  const last = series[0] || 0;
  const past = series.slice(1, 8);
  const meanPast = past.length ? past.reduce((a,b)=>a+b,0)/past.length : 0;
  const mom7 = meanPast ? clamp(50 + 50 * ((last-meanPast)/Math.abs(meanPast)), 0, 100) : 50;

  // Trend 30d slope proxy (last minus 30th sample)
  const back30 = series[29] ?? series.at(-1) ?? last;
  const trend30 = clamp(50 + 50*((last - back30) / (Math.abs(back30) || 1)), 0, 100);

  // Liquidity: use listing count proxy (0..10 -> 0..100)
  let liq = 50, ladder = 50;
  try {
    const listings = await fetchCSFloatListings(itemName);
    liq = clamp((Math.min(10, listings.length) / 10) * 100, 0, 100);
    const spread = ladderSpread(listings);
    ladder = clamp(spread*400, 0, 100); // 25% spread => 100
  } catch {}

  const premRisk = 50; // unknown per-listing sticker fragility in MVP
  const overrideDrag = 50;

  const score = 0.30*mom7 + 0.20*trend30 + 0.20*liq + 0.15*ladder + 0.10*premRisk + 0.05*overrideDrag;
  return { score: Math.round(score), why: explain(score, mom7, trend30, liq, ladder) };
}

function explain(score:number, mom7:number, trend30:number, liq:number, ladder:number): string[] {
  const why: string[] = [];
  if (mom7 > 60) why.push("Above 7d mean");
  if (trend30 > 60) why.push("Uptrend (30d)");
  if (liq > 60) why.push("High liquidity");
  if (ladder > 60) why.push("Wide ladder spread");
  if (!why.length) why.push("Neutral signals");
  return why.slice(0,2);
}
