import fs from "node:fs/promises";
import path from "node:path";
import { withClient } from "@/lib/db";

export async function runMigrations() {
  const file = path.join(process.cwd(), "src/lib/schema.sql");
  const sql = await fs.readFile(file, "utf-8");
  await withClient(async (c) => { await c.query(sql); });
}
