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

    // Safety: disable global TLS verification for this Node process (server-only).
    // This avoids "self-signed certificate in certificate chain" with managed poolers.
    // NOTE: This runs only on the server (API routes). Never bundled to client.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    // Normalize connection string scheme
    let connectionString = env.DATABASE_URL;
    if (connectionString.startsWith("postgresql://")) {
      connectionString = "postgres://" + connectionString.slice("postgresql://".length);
    }

    global.__pgPool__ = new Pool({
      connectionString,
      // pg ignores sslmode in URL; set ssl explicitly
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
