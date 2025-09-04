import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";
import { takeSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    type Row = { steam_id: string };

    const steamIds = await withClient(async (c) => {
      const u = await c.query("SELECT steam_id FROM users");
      const rows = (u.rows as unknown as Row[]);
      return rows.map((r) => r.steam_id);
    });

    const results: Array<{ steamId: string; ok: boolean; total?: number; error?: string }> = [];

    for (const sid of steamIds) {
      try {
        const r = await takeSnapshot(sid);
        results.push({ steamId: sid, ok: true, total: r.total_value });
      } catch (e: any) {
        results.push({ steamId: sid, ok: false, error: e?.message || "snapshot_failed" });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "cron_failed" }, { status: 500 });
  }
}
