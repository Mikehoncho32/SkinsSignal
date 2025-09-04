import { NextResponse } from "next/server";
import { takeSnapshot } from "@/lib/snapshot";

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}));
  const steamId = String(body?.steamId || "");
  if (!/^[0-9]{17}$/.test(steamId)) return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });
  try { const result = await takeSnapshot(steamId); return NextResponse.json({ ok: true, ...result }); }
  catch (e:any) { return NextResponse.json({ ok:false, error: e?.message||"snapshot_failed" }, { status: 500 }); }
}
