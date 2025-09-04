export type PortfolioHistory = {
  history: { taken_at: string; total_value: number }[];
  lastSnapshot?: {
    total: number;
    items: {
      name: string; qty: number;
      market: number; my: number; override: boolean;
      sticker_pct?: number | null;
    }[];
  };
};

export type Movers = {
  gainers: { name: string; pct: number; usd: number }[];
  losers:  { name: string; pct: number; usd: number }[];
};

export type Allocation = { slices: { label: string; value: number }[] };

export type SmartSale = {
  picks: { name: string; score: number; why: string[]; suggest_price?: number | null; window?: string | null }[];
};

export type AlertsList = {
  alerts: { id: number; item_name: string; price_lte?: number | null; float_min?: number | null; float_max?: number | null; stickers?: string[] | null; paint_seed?: number | null; active: boolean }[];
  phone?: { verified: boolean; number?: string };
};
