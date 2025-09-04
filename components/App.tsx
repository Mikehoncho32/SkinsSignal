"use client";
import React from "react";
import { TrendingUp, Calculator, LineChart as LineChartIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";

function Card({ children }: { children: React.ReactNode }) { return <div className=\"rounded-lg bg-neutral-900 border border-neutral-800 p-4 shadow-sm\">{children}</div>; }
function Section({ title, icon, children }: any) { return (
  <Card>
    <div className=\"flex items-center justify-between mb-2\">
      <div className=\"flex items-center gap-2 text-base font-semibold text-neutral-200\">{icon}{title}</div>
    </div>
    {children}
  </Card>
); }
function Stat({ label, value }: { label: string; value: string }){
  return (
    <div className=\"flex flex-col\">
      <span className=\"text-xs text-neutral-400\">{label}</span>
      <span className=\"text-lg font-semibold text-neutral-100\">{value}</span>
    </div>
  );
}

function makeSeries(days: number){
  const now = new Date();
  const out: { date: string; price: number; volume: number }[] = [];
  let p = 420;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const drift = Math.sin((i/5)*Math.PI)*6;
    const noise = (Math.random()-0.5)*8;
    p = Math.max(60, p+drift+noise);
    out.push({ date: d.toISOString().slice(0,10), price: Math.round(p*100)/100, volume: Math.round(40+Math.random()*60) });
  }
  return out;
}
const DEMO_30 = makeSeries(30);
const currency = (n: number) => `$${n.toFixed(2)}`;

export default function App(){
  return (
    <div className=\"min-h-screen bg-neutral-950 p-6 text-neutral-100\">
      <div className=\"max-w-6xl mx-auto space-y-6\">
        <header className=\"flex items-center justify-between\">
          <div className=\"flex items-center gap-3\">
            <TrendingUp className=\"h-6 w-6 text-teal-400\" />
            <h1 className=\"text-2xl font-bold text-neutral-100\">SkinSignal Dashboard</h1>
          </div>
        </header>

        <Section title=\"Item Analytics\" icon={<LineChartIcon className=\"h-4 w-4 text-teal-400\"/>}>
          <div className=\"w-full h-72\">
            <ResponsiveContainer width=\"100%\" height=\"100%\">
              <LineChart data={DEMO_30}>
                <CartesianGrid strokeDasharray=\"3 3\" stroke=\"#27272a\" />
                <XAxis dataKey=\"date\" tick={{ fontSize: 12, fill: \"#a1a1aa\" }} />
                <YAxis tick={{ fontSize: 12, fill: \"#a1a1aa\" }} />
                <Tooltip formatter={(v: any) => currency(v)} contentStyle={{ backgroundColor: \"#18181b\", borderColor: \"#27272a\" }} />
                <Line type=\"monotone\" dataKey=\"price\" dot={false} strokeWidth={2} stroke=\"#14b8a6\" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title=\"Volume\" icon={<Calculator className=\"h-4 w-4 text-teal-400\"/>}>
          <div className=\"w-full h-48\">
            <ResponsiveContainer width=\"100%\" height=\"100%\">
              <BarChart data={DEMO_30}>
                <CartesianGrid strokeDasharray=\"3 3\" stroke=\"#27272a\" />
                <XAxis dataKey=\"date\" tick={{ fontSize: 12, fill: \"#a1a1aa\" }} />
                <YAxis tick={{ fontSize: 12, fill: \"#a1a1aa\" }} />
                <Tooltip contentStyle={{ backgroundColor: \"#18181b\", borderColor: \"#27272a\" }} />
                <Bar dataKey=\"volume\" fill=\"#3b82f6\" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>
    </div>
  );
}