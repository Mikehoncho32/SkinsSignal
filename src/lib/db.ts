import { Pool } from "pg";
import type { PoolClient } from "pg";
import { getEnv } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__pgPool__) {
    const env = getEnv();

    // Normalize URL (handles postgresql:// and postgres://)
    let connectionString = env.DATABASE_URL;
    if (connectionString.startsWith("postgresql://")) {
      connectionString = "postgres://" + connectionString.slice("postgresql://".length);
    }

    // IMPORTANT: pg ignores sslmode in the URL.
    // Force TLS without CA verification to avoid "self-signed certificate" errors.
    global.__pgPool__ = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3, // keep tiny for free tiers
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 30_000,
    });
  }
  return global.__pgPool__;
}

export async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
