export async function fetchSteamInventory(steamId: string) {
  if (!/^[0-9]{17}$/.test(steamId)) { throw new Error("Invalid SteamID64 format"); }
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=en&count=5000`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) { throw new Error(`Steam inventory fetch failed (${res.status})`); }
  return res.json();
}
export type ItemAggregate = { name: string; qty: number };
export function aggregateInventory(raw: any): ItemAggregate[] {
  const assets = raw.assets || []; const descs = raw.descriptions || [];
  const map = new Map<string,string>();
  for (const d of descs) { map.set(`${d.classid}_${d.instanceid}`, d.market_hash_name || d.name); }
  const counts = new Map<string,number>();
  for (const a of assets) {
    const name = map.get(`${a.classid}_${a.instanceid}`); if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()].map(([name, qty]) => ({ name, qty }));
}
