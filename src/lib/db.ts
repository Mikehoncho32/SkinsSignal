import { Pool } from "pg";
import type { PoolClient } from "pg";
import { getEnv } from "@/lib/env";

declare global { var __pgPool__: Pool | undefined; }

export function getPool(): Pool {
  if (!global.__pgPool__) {
    const env = getEnv();
    global.__pgPool__ = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3
    });
  }
  return global.__pgPool__;
}

export async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try { return await fn(client); } finally { client.release(); }
}
