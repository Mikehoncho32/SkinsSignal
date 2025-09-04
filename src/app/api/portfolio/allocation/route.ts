import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const steamId = String(searchParams.get("steamId") || "");
  if (!/^[0-9]{17}$/.test(steamId)) return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });
  try {
    const data = await withClient(async (c) => {
      const u = await c.query("SELECT id FROM users WHERE steam_id=$1", [steamId]);
      if (!u.rowCount) return [];
      const uid = u.rows[0].id;
      const last = await c.query("SELECT id FROM inventory_snapshots WHERE user_id=$1 ORDER BY taken_at DESC LIMIT 1", [uid]);
      if (!last.rowCount) return [];
      const sid = last.rows[0].id;
      const rows = await c.query("SELECT category, SUM(qty*valued_price_usd_effective)::numeric AS value FROM item_snapshots WHERE snapshot_id=$1 GROUP BY category", [sid]);
      return rows.rows;
    });
    const slices = data.map((r:any)=>({ label: r.category || "Others", value: Number(r.value||0) }));
    return NextResponse.json({ slices });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message||"allocation_failed" }, { status: 500 });
  }
}
