import { withClient } from "@/lib/db";
import { fetchSteamInventory, aggregateInventory } from "@/lib/steam";
import { valueOneItem } from "@/lib/valuation";
import { getEnv } from "@/lib/env";

async function upsertUserId(steamId: string): Promise<number> {
  return await withClient(async (c) => {
    const r = await c.query(
      "INSERT INTO users (steam_id) VALUES ($1) ON CONFLICT (steam_id) DO UPDATE SET steam_id=EXCLUDED.steam_id RETURNING id",
      [steamId]
    );
    return r.rows[0].id as number;
  });
}

async function ensureRateLimit(userId: number) {
  const row = await withClient(async (c) => {
    const r = await c.query("SELECT taken_at FROM inventory_snapshots WHERE user_id=$1 ORDER BY taken_at DESC LIMIT 1", [userId]);
    return r.rows[0] || null;
  });
  if (row) {
    const last = new Date(row.taken_at).getTime();
    const now = Date.now();
    if (now - last < 60_000) {
      const wait = Math.ceil((60_000 - (now - last))/1000);
      throw new Error(`rate_limited: please wait ${wait}s before taking another snapshot`);
    }
  }
}

async function sendSMS(to: string, body: string) {
  const env = getEnv();
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    // No-op in dev; surface as console log.
    console.log("[sms] (dev) to=%s body=%s", to, body);
    return { ok: true, test: true };
  }
  const creds = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  const form = new URLSearchParams({ From: env.TWILIO_FROM_NUMBER, To: to, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: { "Authorization": `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  if (!res.ok) throw new Error(`twilio_failed_${res.status}`);
  return await res.json();
}

async function evaluateAlerts(userId: number, items: any[], snapshotId: number) {
  const alerts = await withClient(async (c) => {
    const r = await c.query("SELECT * FROM alerts WHERE user_id=$1 AND active=true", [userId]);
    return r.rows;
  });
  if (!alerts.length) return;

  const env = getEnv();
  const user = await withClient(async (c) => {
    const r = await c.query("SELECT phone_e164, phone_verified FROM users WHERE id=$1", [userId]);
    return r.rows[0] || null;
  });

  for (const al of alerts) {
    const it = items.find(x => x.name === al.item_name);
    if (!it) continue;
    const market = Number(it.valued_price_usd_market || 0);
    if (al.price_lte != null && market > Number(al.price_lte)) continue;

    // Cooldown: 2h
    const recent = await withClient(async (c) => {
      const r = await c.query("SELECT fired_at FROM alert_events WHERE alert_id=$1 AND fired_at > now() - interval '2 hours' ORDER BY fired_at DESC LIMIT 1", [al.id]);
      return r.rows[0] || null;
    });
    if (recent) continue;

    const payload = { item: it.name, market, snapshotId };
    await withClient(async (c) => {
      await c.query("INSERT INTO alert_events (alert_id, payload_json) VALUES ($1, $2)", [al.id, payload]);
    });

    if (user?.phone_verified && user?.phone_e164) {
      try {
        await sendSMS(user.phone_e164, `SkinSignal: ${it.name} is at $${market.toFixed(2)} (≤ your $${Number(al.price_lte||0).toFixed(2)})`);
      } catch (e) { console.error("[sms] failed:", e); }
    }
  }
}

export async function takeSnapshot(steamId: string) {
  const userId = await upsertUserId(steamId);
  await ensureRateLimit(userId);

  const raw = await fetchSteamInventory(steamId);
  if (!raw || !Array.isArray(raw?.assets)) { throw new Error("Inventory is private or unavailable"); }
  const itemsAgg = aggregateInventory(raw);

  const valued: any[] = [];
  for (const it of itemsAgg) { valued.push(await valueOneItem(userId, it)); }

  const total_value = valued.reduce((s, v) => s + (Number(v.valued_price_usd_effective||0) * Number(v.qty||0)), 0);

  const snapshotId = await withClient(async (c) => {
    const r1 = await c.query("INSERT INTO inventory_snapshots (user_id, total_value) VALUES ($1, $2) RETURNING id", [userId, total_value.toFixed(2)]);
    const sid = r1.rows[0].id as number;
    for (const v of valued) {
      await c.query(
        `INSERT INTO item_snapshots (snapshot_id,name,qty,category,base_price_usd,sticker_sum_usd,sticker_premium_pct,sticker_premium_usd,valued_price_usd_market,valued_price_usd_effective,override_applied,float_value,paint_seed,stickers_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [sid, v.name, v.qty, v.category, v.base_price_usd, v.sticker_sum_usd, v.sticker_premium_pct, v.sticker_premium_usd, v.valued_price_usd_market, v.valued_price_usd_effective, v.override_applied, v.float_value, v.paint_seed, v.stickers_json]
      );
    }
    return sid;
  });

  // Evaluate alerts (non-blocking best-effort)
  try { await evaluateAlerts(userId, valued, snapshotId); } catch (e) { console.error("[alerts] eval failed:", e); }

  return { snapshotId, total_value, items: valued };
}
