import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const steamId = String(searchParams.get("steamId") || "");
  if (!/^[0-9]{17}$/.test(steamId)) {
    return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });
  }

  try {
    const result = await withClient(async (c) => {
      type IdRow = { id: number };
      type ItemRow = {
        name: string;
        qty: number | string;
        valued_price_usd_effective: number | string | null;
      };

      const u = await c.query("SELECT id FROM users WHERE steam_id=$1", [steamId]);
      const userRows = (u.rows as unknown as IdRow[]);
      if (!userRows.length) return { gainers: [], losers: [] };

      const uid = userRows[0].id;

      const snapsRes = await c.query(
        "SELECT id FROM inventory_snapshots WHERE user_id=$1 ORDER BY taken_at DESC LIMIT 2",
        [uid]
      );
      const snapRows = (snapsRes.rows as unknown as IdRow[]);
      if (snapRows.length < 2) return { gainers: [], losers: [] };

      const [sidNow, sidPrev] = [snapRows[0].id, snapRows[1].id];

      const nowRes = await c.query(
        "SELECT name, qty, valued_price_usd_effective FROM item_snapshots WHERE snapshot_id=$1",
        [sidNow]
      );
      const prevRes = await c.query(
        "SELECT name, qty, valued_price_usd_effective FROM item_snapshots WHERE snapshot_id=$1",
        [sidPrev]
      );

      const prevRows = (prevRes.rows as unknown as ItemRow[]);
      const nowRows = (nowRes.rows as unknown as ItemRow[]);

      const mapPrev = new Map<string, number>();
      for (const r of prevRows) {
        const qty = Number(r.qty);
        const val = Number(r.valued_price_usd_effective ?? 0);
        mapPrev.set(r.name, qty * val);
      }

      const deltas: { name: string; usd: number; pct: number }[] = [];
      for (const r of nowRows) {
        const curQty = Number(r.qty);
        const curPU = Number(r.valued_price_usd_effective ?? 0);
        const cur = curQty * curPU;

        const was = mapPrev.get(r.name) ?? 0;
        const d = cur - was;
        const pct = was ? (d / was) * 100 : cur ? 100 : 0;

        deltas.push({ name: r.name, usd: d, pct });
      }

      deltas.sort((a, b) => b.usd - a.usd);
      const gainers = deltas.slice(0, 3);
      const losers = deltas.slice(-3).reverse();

      return { gainers, losers };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "movers_failed" }, { status: 500 });
  }
}
