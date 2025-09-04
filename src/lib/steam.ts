// src/lib/steam.ts

// Helper: strict SteamID64 check (17 digits) and trim any stray whitespace
export function normalizeSteamId(raw: string): string {
  const s = String(raw || "").trim();
  if (!/^[0-9]{17}$/.test(s)) {
    throw new Error("invalid_steam_id: expected 17-digit SteamID64");
  }
  return s;
}

/**
 * Fetches public Steam inventory for CS2 (app 730).
 * Throws a detailed error that includes HTTP status and (if present) a short body snippet.
 */
export async function fetchSteamInventory(steamIdRaw: string) {
  const steamId = normalizeSteamId(steamIdRaw);

  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=en&count=5000`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
      // Trim very long HTML error pages down to something readable
      if (body.length > 500) body = body.slice(0, 500) + "…";
    } catch {
      // ignore
    }
    const msg = `steam_fetch_failed: ${res.status}${
      body ? ` body=${JSON.stringify(body)}` : ""
    }`;
    throw new Error(msg);
  }

  const json = await res.json().catch(() => null);
  if (!json || !Array.isArray(json.assets) || !Array.isArray(json.descriptions)) {
    throw new Error("steam_invalid_payload: missing assets/descriptions");
  }
  return json;
}

// Aggregate CS2 items by market_hash_name/name
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
