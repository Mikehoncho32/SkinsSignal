// src/app/api/steam/inventory/route.ts
import { NextResponse } from "next/server";
import { normalizeSteamId } from "@/lib/steam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const steamIdRaw = String(searchParams.get("steamId") || "");
  try {
    const steamId = normalizeSteamId(steamIdRaw);
    const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=en&count=5000`;

    const res = await fetch(url, { cache: "no-store" });
    const status = res.status;
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      bodyText = "<no-body>";
    }

    let json: any = null;
    try { json = JSON.parse(bodyText); } catch {}

    if (json) {
      return NextResponse.json({ ok: status === 200, status, json });
    } else {
      const preview = bodyText.length > 1000 ? bodyText.slice(0, 1000) + "…" : bodyText;
      return NextResponse.json({ ok: status === 200, status, text: preview });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "invalid_request" }, { status: 400 });
  }
}
