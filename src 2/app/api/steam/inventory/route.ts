// src/app/api/steam/inventory/route.ts
import { NextResponse } from "next/server";
import { normalizeSteamId } from "@/lib/steam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchPrimary(steamId: string) {
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=en&count=5000`;
  const res = await fetch(url, { cache: "no-store" });
  const status = res.status;
  const text = await res.text().catch(() => "<no-body>");
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { which: "primary", status, json, text: json ? undefined : text.slice(0, 1000) };
}

async function fetchLegacy(steamId: string) {
  const url = `https://steamcommunity.com/profiles/${steamId}/inventory/json/730/2`;
  const res = await fetch(url, { cache: "no-store" });
  const status = res.status;
  const text = await res.text().catch(() => "<no-body>");
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { which: "legacy", status, json, text: json ? undefined : text.slice(0, 1000) };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const steamIdRaw = String(searchParams.get("steamId") || "");

  try {
    const steamId = normalizeSteamId(steamIdRaw);

    const primary = await fetchPrimary(steamId);
    if (primary.status === 200 && primary.json) {
      return NextResponse.json({ ok: true, tried: [primary] });
    }

    const legacy = await fetchLegacy(steamId);
    const okLegacy = legacy.status === 200 && legacy.json?.success === true;
    return NextResponse.json({ ok: okLegacy, tried: [primary, legacy] }, { status: okLegacy ? 200 : 502 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "invalid_request" }, { status: 400 });
  }
}
