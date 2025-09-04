import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}));
  const steamId = String(body?.steamId || "");
  const code = String(body?.code || "");
  if (!/^[0-9]{17}$/.test(steamId)) return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });
  if (!/^[0-9]{6}$/.test(code)) return NextResponse.json({ error: "invalid_code" }, { status: 400 });

  try {
    const ok = await withClient(async (c) => {
      const u = await c.query("SELECT id FROM users WHERE steam_id=$1", [steamId]);
      if (!u.rowCount) throw new Error("user_not_found");
      const uid = u.rows[0].id;
      const pv = await c.query("SELECT id FROM phone_verifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1", [uid]);
      if (!pv.rowCount) return false;
      const id = pv.rows[0].id;
      const cur = await c.query("SELECT code FROM phone_verifications WHERE id=$1", [id]);
      const match = cur.rows[0]?.code === code;
      if (match) {
        await c.query("UPDATE users SET phone_verified=true WHERE id=$1", [uid]);
      }
      return match;
    });
    if (!ok) return NextResponse.json({ ok:false, error: "verify_failed" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message||"phone_verify_failed" }, { status: 500 });
  }
}
