import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const steamId = String(searchParams.get("steamId") || "");
  if (!/^[0-9]{17}$/.test(steamId)) return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });
  try {
    const rows = await withClient(async (c) => {
      const u = await c.query("SELECT id FROM users WHERE steam_id=$1", [steamId]);
      if (!u.rowCount) return [];
      const uid = u.rows[0].id;
      const h = await c.query("SELECT taken_at, total_value FROM inventory_snapshots WHERE user_id=$1 ORDER BY taken_at ASC", [uid]);
      return h.rows;
    });
    return NextResponse.json({ history: rows });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message||"history_failed" }, { status: 500 });
  }
}
