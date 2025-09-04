import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";
import { getEnv } from "@/lib/env";

function code6() { return Math.floor(100000 + Math.random()*900000).toString(); }

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}));
  const steamId = String(body?.steamId || "");
  const phone = String(body?.phone || "");
  if (!/^[0-9]{17}$/.test(steamId)) return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });
  if (!/^[+][0-9]{7,15}$/.test(phone)) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  try {
    const env = process.env; const hasTwilio = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);
    const code = code6();
    const result = await withClient(async (c) => {
      const u = await c.query("INSERT INTO users (steam_id, phone_e164) VALUES ($1,$2) ON CONFLICT (steam_id) DO UPDATE SET phone_e164=EXCLUDED.phone_e164 RETURNING id", [steamId, phone]);
      const uid = u.rows[0].id;
      await c.query("INSERT INTO phone_verifications (user_id, code) VALUES ($1,$2)", [uid, code]);
      return { uid };
    });
    if (hasTwilio) {
      const creds = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const form = new URLSearchParams({ From: env.TWILIO_FROM_NUMBER!, To: phone, Body: `SkinSignal verification code: ${code}` });
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: { "Authorization": `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: form
      });
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({ ok: true, test_code: code });
    }
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message||"phone_start_failed" }, { status: 500 });
  }
}
