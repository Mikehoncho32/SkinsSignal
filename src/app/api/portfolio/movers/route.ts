import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const steamId = String(searchParams.get("steamId") || "");
  if (!/^[0-9]{17}$/.test(steamId)) return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });
  try {
    const result = await withClient(async (c) => {
      const u = await c.query("SELECT id FROM users WHERE steam_id=$1", [steamId]);
      if (!u.rowCount) return { gainers: [], losers: [] };
      const uid = u.rows[0].id;
      const snaps = await c.query("SELECT id FROM inventory_snapshots WHERE user_id=$1 ORDER BY taken_at DESC LIMIT 2", [uid]);
      if (snaps.rowCount < 2) return { gainers: [], losers: [] };
      const [sidNow, sidPrev] = [snaps.rows[0].id, snaps.rows[1].id];
      const now = await c.query("SELECT name, qty, valued_price_usd_effective FROM item_snapshots WHERE snapshot_id=$1", [sidNow]);
      const prev = await c.query("SELECT name, qty, valued_price_usd_effective FROM item_snapshots WHERE snapshot_id=$1", [sidPrev]);
      const mapPrev = new Map(prev.rows.map((r:any)=>[r.name, Number(r.qty)*Number(r.valued_price_usd_effective||0)]));
      const deltas: { name: string; usd: number; pct: number }[] = [];
      for (const r of now.rows) {
        const cur = Number(r.qty) * Number(r.valued_price_usd_effective||0);
        const was = mapPrev.get(r.name) || 0;
        const d = cur - was;
        const pct = was ? (d/was)*100 : (cur ? 100 : 0);
        deltas.push({ name: r.name, usd: d, pct });
      }
      deltas.sort((a,b)=>b.usd-a.usd);
      const gainers = deltas.slice(0,3);
      const losers = deltas.slice(-3).reverse();
      return { gainers, losers };
    });
    return NextResponse.json(result);
  } catch (e:any) {
    return NextResponse.json({ error: e?.message||"movers_failed" }, { status: 500 });
  }
}
