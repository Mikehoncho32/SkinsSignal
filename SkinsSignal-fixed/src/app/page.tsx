"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type HistoryPoint = { taken_at: string; total_value: number };
type Movers = { gainers: { name: string; pct: number; usd: number }[]; losers: { name: string; pct: number; usd: number }[] };
type AllocationSlice = { label: string; value: number };
type SmartPick = { name: string; score: number; why: string[]; suggest_price?: number | null; window?: string | null };
type AlertsList = { alerts: { id:number; item_name:string; price_lte?:number|null; active:boolean }[]; phone?: { verified:boolean; number?:string } };

export default function Home() {
  const [steamId, setSteamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|undefined>();
  const [latestTotal, setLatestTotal] = useState<number|undefined>();
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [allocation, setAllocation] = useState<AllocationSlice[]>([]);
  const [movers, setMovers] = useState<Movers>({ gainers: [], losers: [] });
  const [picks, setPicks] = useState<SmartPick[]>([]);
  const [alerts, setAlerts] = useState<AlertsList|undefined>(undefined);

  async function snapshot() {
    setBusy(true); setErr(undefined);
    try {
      const res = await fetch("/api/portfolio/snapshot", { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify({ steamId }) });
      const j = await res.json();
      if (!res.ok || j?.ok===false) throw new Error(j?.error || "snapshot_failed");
      setLatestTotal(j.total_value);
      await refreshAll();
    } catch (e:any) {
      setErr(e?.message || "snapshot_failed");
    } finally { setBusy(false); }
  }

  async function refreshAll() {
    if (!/^[0-9]{17}$/.test(steamId)) return;
    const [h,a,m,s,al] = await Promise.allSettled([
      fetch(`/api/portfolio/history?steamId=${steamId}`).then(r=>r.json()),
      fetch(`/api/portfolio/allocation?steamId=${steamId}`).then(r=>r.json()),
      fetch(`/api/portfolio/movers?steamId=${steamId}`).then(r=>r.json()),
      fetch(`/api/portfolio/smart-sale?steamId=${steamId}`).then(r=>r.json()),
      fetch(`/api/alerts?steamId=${steamId}`).then(r=>r.json())
    ]);
    if (h.status==="fulfilled") setHistory(h.value.history||[]);
    if (a.status==="fulfilled") setAllocation(a.value.slices||[]);
    if (m.status==="fulfilled") setMovers({ gainers: m.value.gainers||[], losers: m.value.losers||[] });
    if (s.status==="fulfilled") setPicks(s.value.picks||[]);
    if (al.status==="fulfilled") setAlerts(al.value);
  }

  useEffect(()=>{ /* noop */ }, []);

  const chartData = useMemo(()=> (history||[]).map((p:any)=>({ t: new Date(p.taken_at).toLocaleDateString(), v: Number(p.total_value||0) })), [history]);

  async function startPhoneVerify(phone: string) {
    const res = await fetch("/api/user/phone/start", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ steamId, phone }) });
    const j = await res.json();
    if (!res.ok || j?.ok===false) throw new Error(j?.error || "phone_failed");
    if (j.test_code) alert(`DEV ONLY — test code: ${j.test_code}`);
    await refreshAll();
  }
  async function verifyCode(code: string) {
    const res = await fetch("/api/user/phone/verify", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ steamId, code }) });
    const j = await res.json();
    if (!res.ok || j?.ok===false) throw new Error(j?.error || "verify_failed");
    await refreshAll();
  }
  async function createAlert(item: string, price: number) {
    const res = await fetch("/api/alerts", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ steamId, item_name: item, price_lte: price }) });
    const j = await res.json();
    if (!res.ok || j?.ok===false) throw new Error(j?.error || "alert_failed");
    await refreshAll();
  }

  return (
    <main className="space-y-6">
      <section className="card">
        <div className="card-header">Connect & Snapshot</div>
        <div className="card-body space-y-3">
          <div className="flex gap-3">
            <input className="input" placeholder="SteamID64 (17 digits)"
              value={steamId} onChange={e=>setSteamId(e.target.value)} />
            <button className="btn" onClick={snapshot} disabled={busy || !/^[0-9]{17}$/.test(steamId)}>
              {busy ? "Working..." : "Snapshot Now"}
            </button>
            <button className="btn" onClick={refreshAll} disabled={!/^[0-9]{17}$/.test(steamId)}>Refresh</button>
          </div>
          {err && <div className="text-red-300 text-sm">Error: {err}</div>}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-header">Portfolio Total</div>
          <div className="card-body text-2xl font-semibold">${(latestTotal ?? (history.at(-1)?.total_value || 0)).toFixed(2)}</div>
        </div>
        <div className="card md:col-span-2">
          <div className="card-header">History (Total Value)</div>
          <div className="card-body h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="t" hide />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="v" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-header">Allocation</div>
          <div className="card-body h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocation} dataKey="value" nameKey="label" outerRadius={90} label>
                  {allocation.map((_, i) => <Cell key={i} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Top Movers</div>
          <div className="card-body">
            <div className="text-sm text-sub mb-2">Gainers</div>
            <ul className="space-y-1 mb-3">{movers.gainers.map(g=> <li key={g.name} className="flex justify-between"><span>{g.name}</span><span className="text-green-300">+${g.usd.toFixed(2)} ({g.pct.toFixed(1)}%)</span></li>)}</ul>
            <hr className="div" />
            <div className="text-sm text-sub mb-2">Losers</div>
            <ul className="space-y-1">{movers.losers.map(g=> <li key={g.name} className="flex justify-between"><span>{g.name}</span><span className="text-red-300">${g.usd.toFixed(2)} ({g.pct.toFixed(1)}%)</span></li>)}</ul>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Smart Sale (Top Picks)</div>
          <div className="card-body">
            {!picks.length && <div className="text-sub text-sm">Need more history; take more snapshots.</div>}
            <ul className="space-y-2">{picks.map(p=> (
              <li key={p.name} className="border border-white/10 rounded-xl p-2">
                <div className="flex items-center justify-between"><div className="font-medium">{p.name}</div><div className="badge">Score {p.score}</div></div>
                <div className="text-sub text-xs">{p.why.join(" • ")}</div>
                {p.suggest_price ? <div className="text-sm mt-1">Suggest: ${p.suggest_price.toFixed(2)} {p.window ? `• ${p.window}` : ""}</div> : null}
              </li>
            ))}</ul>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">Alerts & SMS</div>
        <div className="card-body space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-sub">Phone (E.164, e.g. +15551234567)</label>
              <input id="phone" className="input" placeholder="+15551234567" />
            </div>
            <button className="btn" onClick={()=>{
              const phone = (document.getElementById("phone") as HTMLInputElement).value;
              startPhoneVerify(phone).catch(e=>alert(e.message));
            }}>Send Code</button>
            <div>
              <label className="text-xs text-sub">Code</label>
              <input id="code" className="input" placeholder="123456" />
            </div>
            <button className="btn" onClick={()=>{
              const code = (document.getElementById("code") as HTMLInputElement).value;
              verifyCode(code).catch(e=>alert(e.message));
            }}>Verify</button>
          </div>
          <div className="text-sm">
            Status: <span className="badge">{alerts?.phone?.verified ? "Verified" : "Not Verified"}</span> {alerts?.phone?.number ? `• ${alerts.phone.number}` : ""}
          </div>
          <hr className="div" />
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-sub">Item name (market_hash_name)</label>
              <input id="aname" className="input" placeholder="AK-47 | Redline (Field-Tested)" />
            </div>
            <div>
              <label className="text-xs text-sub">Price ≤ (USD)</label>
              <input id="aprice" className="input" placeholder="12.34" />
            </div>
            <button className="btn" onClick={()=>{
              const item = (document.getElementById("aname") as HTMLInputElement).value;
              const price = Number((document.getElementById("aprice") as HTMLInputElement).value);
              createAlert(item, price).catch(e=>alert(e.message));
            }}>Create Alert</button>
          </div>
          <div>
            <div className="text-sm text-sub mb-1">My Alerts</div>
            {!alerts?.alerts?.length && <div className="text-sm">No alerts yet.</div>}
            <ul className="space-y-1">{alerts?.alerts?.map(a=> (
              <li key={a.id} className="flex items-center justify-between border border-white/10 rounded-xl p-2">
                <div><span className="font-medium">{a.item_name}</span> {a.price_lte != null ? <span className="text-sub text-xs">≤ ${Number(a.price_lte).toFixed(2)}</span> : null}</div>
                <div className="badge">{a.active ? "Active" : "Off"}</div>
              </li>
            ))}</ul>
          </div>
        </div>
      </section>
    </main>
  );
}
