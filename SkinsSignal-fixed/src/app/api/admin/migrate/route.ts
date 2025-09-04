// src/app/api/admin/migrate/route.ts
import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await withClient(async (c) => {
      await c.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          steam_id TEXT UNIQUE,
          phone_e164 TEXT,
          phone_verified BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);
      await c.query(`
        CREATE TABLE IF NOT EXISTS inventory_snapshots (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          total_value NUMERIC(14,2) NOT NULL
        );
      `);
      await c.query(`
        CREATE TABLE IF NOT EXISTS item_snapshots (
          id BIGSERIAL PRIMARY KEY,
          snapshot_id BIGINT REFERENCES inventory_snapshots(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          qty INTEGER NOT NULL,
          category TEXT,
          base_price_usd NUMERIC(12,2),
          sticker_sum_usd NUMERIC(12,2),
          sticker_premium_pct NUMERIC(6,4),
          sticker_premium_usd NUMERIC(12,2),
          valued_price_usd_market NUMERIC(12,2),
          valued_price_usd_effective NUMERIC(12,2),
          override_applied BOOLEAN DEFAULT false,
          float_value NUMERIC(6,5),
          paint_seed INTEGER,
          stickers_json JSONB
        );
      `);
      await c.query(`
        CREATE TABLE IF NOT EXISTS item_overrides (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          item_name TEXT NOT NULL,
          custom_value_usd NUMERIC(12,2),
          note TEXT,
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(user_id, item_name)
        );
      `);
      await c.query(`
        CREATE TABLE IF NOT EXISTS alerts (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          item_name TEXT NOT NULL,
          price_lte NUMERIC(12,2),
          float_min NUMERIC(6,5),
          float_max NUMERIC(6,5),
          stickers_json JSONB,
          paint_seed INTEGER,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);
      await c.query(`
        CREATE TABLE IF NOT EXISTS alert_events (
          id BIGSERIAL PRIMARY KEY,
          alert_id BIGINT REFERENCES alerts(id) ON DELETE CASCADE,
          fired_at TIMESTAMPTZ DEFAULT now(),
          payload_json JSONB
        );
      `);
      await c.query(`
        CREATE TABLE IF NOT EXISTS phone_verifications (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          code TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      await c.query(`CREATE INDEX IF NOT EXISTS idx_snapshots_user_time ON inventory_snapshots(user_id, taken_at DESC);`);
      await c.query(`CREATE INDEX IF NOT EXISTS idx_items_snapshot ON item_snapshots(snapshot_id);`);
      await c.query(`CREATE INDEX IF NOT EXISTS idx_overrides_user_item ON item_overrides(user_id, item_name);`);
      await c.query(`CREATE INDEX IF NOT EXISTS idx_alerts_user_item ON alerts(user_id, item_name);`);
      await c.query(`CREATE INDEX IF NOT EXISTS idx_alert_events_alert_time ON alert_events(alert_id, fired_at DESC);`);
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "migrate_failed" }, { status: 500 });
  }
}
