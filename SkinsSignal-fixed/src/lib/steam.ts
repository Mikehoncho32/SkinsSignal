// src/lib/steam.ts

export function normalizeSteamId(raw: string): string {
  const s = String(raw || "").trim();
  if (!/^[0-9]{17}$/.test(s)) {
    throw new Error("invalid_steam_id: expected 17-digit SteamID64");
  }
  return s;
}

type SteamAssetsPayload = { assets: any[]; descriptions: any[] };

async function fetchPrimary(steamId: string): Promise<Response> {
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=en&count=5000`;
  return fetch(url, { cache: "no-store" });
}

async function fetchLegacy(steamId: string): Promise<Response> {
  const url = `https://steamcommunity.com/profiles/${steamId}/inventory/json/730/2`;
  return fetch(url, { cache: "no-store" });
}

function normalizeLegacy(json: any): SteamAssetsPayload {
  const inv = json?.rgInventory || {};
  const desc = json?.rgDescriptions || {};

  const assets: any[] = Object.values(inv).map((a: any) => ({
    appid: 730,
    classid: String(a.classid),
    instanceid: String(a.instanceid || "0"),
    amount: String(a.amount || "1"),
  }));

  const descriptions: any[] = Object.values(desc).map((d: any) => ({
    appid: 730,
    classid: String(d.classid),
    instanceid: String(d.instanceid || "0"),
    market_hash_name: d.market_hash_name || d.name,
    name: d.name,
  }));

  return { assets, descriptions };
}

export async function fetchSteamInventory(steamIdRaw: string): Promise<SteamAssetsPayload> {
  const steamId = normalizeSteamId(steamIdRaw);

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchPrimary(steamId);
    if (res.ok) {
      const j = await res.json().catch(() => null);
      if (j && Array.isArray(j.assets) && Array.isArray(j.descriptions)) {
        return j;
      }
      throw new Error("steam_invalid_payload: missing assets/descriptions");
    }
    if (![400, 401, 403, 404].includes(res.status)) {
      await new Promise(r => setTimeout(r, 800));
      continue;
    }
    break;
  }

  const legacyRes = await fetchLegacy(steamId);
  if (!legacyRes.ok) {
    const body = await legacyRes.text().catch(() => "");
    throw new Error(`steam_fetch_failed: ${legacyRes.status}${body ? " body=" + JSON.stringify(body.slice(0,500)) : ""}`);
  }
  const legacyJson = await legacyRes.json().catch(() => null);
  if (!legacyJson || legacyJson.success !== true) {
    throw new Error("steam_legacy_failed: unexpected payload");
  }
  const normalized = normalizeLegacy(legacyJson);
  if (!Array.isArray(normalized.assets) || !Array.isArray(normalized.descriptions)) {
    throw new Error("steam_legacy_invalid_payload");
  }
  return normalized;
}

export type ItemAggregate = { name: string; qty: number };

export function aggregateInventory(raw: any): ItemAggregate[] {
  const assets = raw.assets || [];
  const descs = raw.descriptions || [];

  const keyToName = new Map<string, string>();
  for (const d of descs) {
    const key = `${d.classid}_${d.instanceid}`;
    const name = d.market_hash_name || d.name;
    if (key && name) keyToName.set(key, name);
  }

  const counts = new Map<string, number>();
  for (const a of assets) {
    const name = keyToName.get(`${a.classid}_${a.instanceid}`);
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  return [...counts.entries()].map(([name, qty]) => ({ name, qty }));
}
