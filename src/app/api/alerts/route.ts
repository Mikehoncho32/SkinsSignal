import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const steamId = String(searchParams.get("steamId") || "");
  if (!/^[0-9]{17}$/.test(steamId)) return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });
  try {
    const result = await withClient(async (c) => {
      const u = await c.query("SELECT id, phone_e164, phone_verified FROM users WHERE steam_id=$1", [steamId]);
      if (!u.rowCount) return { alerts: [], phone: { verified: false } };
      const uid = u.rows[0].id;
      const alerts = await c.query("SELECT id, item_name, price_lte, float_min, float_max, paint_seed, active FROM alerts WHERE user_id=$1 ORDER BY created_at DESC", [uid]);
      const phone = { verified: !!u.rows[0].phone_verified, number: u.rows[0].phone_e164 || undefined };
      return { alerts: alerts.rows, phone };
    });
    return NextResponse.json(result);
  } catch (e:any) {
    return NextResponse.json({ error: e?.message||"alerts_failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}));
  const steamId = String(body?.steamId || "");
  const item_name = String(body?.item_name || "");
  const price_lte = body?.price_lte != null ? Number(body.price_lte) : null;
  if (!/^[0-9]{17}$/.test(steamId)) return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });
  if (!item_name) return NextResponse.json({ error: "missing_item_name" }, { status: 400 });
  try {
    const id = await withClient(async (c) => {
      const u = await c.query("SELECT id FROM users WHERE steam_id=$1", [steamId]);
      if (!u.rowCount) throw new Error("user_not_found");
      const uid = u.rows[0].id;
      const r = await c.query("INSERT INTO alerts (user_id, item_name, price_lte, active) VALUES ($1,$2,$3,true) RETURNING id", [uid, item_name, price_lte]);
      return r.rows[0].id as number;
    });
    return NextResponse.json({ ok: true, id });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message||"create_alert_failed" }, { status: 500 });
  }
}
