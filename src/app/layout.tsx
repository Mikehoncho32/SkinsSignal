import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkinSignal – Inventory Trader",
  description: "CS2 trading dashboard (CSFloat-only).",
  openGraph: { title: "SkinSignal – Inventory Trader", description: "CS2 trading dashboard (CSFloat-only).", type: "website" },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container-max py-6">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold">SkinSignal – Inventory Trader</h1>
            <div className="badge">CSFloat lane • MVP</div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
