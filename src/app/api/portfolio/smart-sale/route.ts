import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";
import { computeSaleScore } from "@/lib/salescore";
import { fetchCSFloatListings } from "@/lib/csfloat";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const steamId = String(searchParams.get("steamId") || "");
  if (!/^[0-9]{17}$/.test(steamId)) return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });

  try {
    const items = await withClient(async (c) => {
      const u = await c.query("SELECT id FROM users WHERE steam_id=$1", [steamId]);
      if (!u.rowCount) return [];
      const uid = u.rows[0].id;
      const last = await c.query("SELECT id FROM inventory_snapshots WHERE user_id=$1 ORDER BY taken_at DESC LIMIT 1", [uid]);
      if (!last.rowCount) return [];
      const sid = last.rows[0].id;
      const rows = await c.query("SELECT name, qty, valued_price_usd_market FROM item_snapshots WHERE snapshot_id=$1", [sid]);
      return rows.rows.map((r:any)=>({ name: r.name as string, qty: Number(r.qty||0), market: Number(r.valued_price_usd_market||0), uid }));
    });

    const scores = [];
    for (const it of items) {
      const s = await computeSaleScore(it.uid, it.name);
      let suggest: number | null = null;
      try {
        const listings = await fetchCSFloatListings(it.name);
        const prices = listings.map((l:any)=>Number(l.price||0)).filter((n:number)=>n>0).sort((a:number,b:number)=>a-b);
        if (prices.length >= 2) suggest = +(prices[1] * 0.995).toFixed(2); // undercut #2 slightly
      } catch {}
      scores.push({ name: it.name, score: s.score, why: s.why, suggest_price: suggest, window: s.score >= 70 ? "fast exit" : s.score >= 40 ? "1–2 days" : null });
    }
    scores.sort((a,b)=>b.score-a.score);
    return NextResponse.json({ picks: scores.slice(0,3) });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message||"smart_sale_failed" }, { status: 500 });
  }
}
