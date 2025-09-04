// src/lib/db.ts
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

    // Safety: ensure Node TLS doesn't block self-signed chain (server-only)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    let connectionString = env.DATABASE_URL;
    if (connectionString.startsWith("postgresql://")) {
      connectionString = "postgres://" + connectionString.slice("postgresql://".length);
    }

    global.__pgPool__ = new Pool({
      connectionString,
      ssl: { require: true, rejectUnauthorized: false },
      max: 3,
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
