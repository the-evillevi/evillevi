/** Contracts mirroring the AlphaDrop FastAPI response models (app/models.py). */

export interface StockMetrics {
  ticker: string;
  name: string | null;
  sector: string | null;
  currency: string | null;
  price: number | null;
  high_52w: number | null;
  /** 0.30 = trading 30% below the 52-week high. */
  pct_from_high: number | null;
  above_ma50: boolean | null;
  ret_1m: number | null;
  ret_3m: number | null;
  forward_pe: number | null;
  peg: number | null;
  ev_ebitda: number | null;
  price_to_book: number | null;
  fcf_yield: number | null;
  rev_growth_yoy: number | null;
  eps_cagr: number | null;
  eps_cagr_years: number | null;
  margin_trend: "expanding" | "stable" | "contracting" | null;
  roe: number | null;
  debt_ebitda: number | null;
  fcf: number | null;
  profit_margin: number | null;
  operating_margin: number | null;
  recommendation_mean: number | null;
  target_upside: number | null;
  analyst_count: number | null;
  market_cap: number | null;
  avg_volume: number | null;
  data_completeness: number;
}

/** The four factor pillars (0-25 each) plus the drop-opportunity bonus (0-10). */
export interface PillarScores {
  value: number;
  growth: number;
  quality: number;
  momentum: number;
  bonus: number;
}

export interface ScoredStock {
  metrics: StockMetrics;
  scores: PillarScores;
  composite: number;
  thesis: string;
}

export interface ScreenResponse {
  as_of: string;
  universe_size: number;
  passed_filters: number;
  results: ScoredStock[];
}
