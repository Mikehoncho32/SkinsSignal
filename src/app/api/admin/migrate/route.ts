import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/migrate";

export async function GET() {
  try { await runMigrations(); return NextResponse.json({ ok: true }); }
  catch (e:any) { console.error(e); return NextResponse.json({ ok:false, error: e?.message||"migrate_failed" }, { status: 500 }); }
}
