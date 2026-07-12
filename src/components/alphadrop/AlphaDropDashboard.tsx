import { Fragment, useEffect, useMemo, useState } from "react";

import snapshotData from "@/lib/alphadrop/snapshot.json";
import type { ScoredStock, ScreenResponse } from "@/lib/alphadrop/types";

/* AlphaDrop opportunity dashboard.
 *
 * Tries the live FastAPI service on Render first (PUBLIC_ALPHADROP_API);
 * if it's asleep or unreachable it falls back to the bundled snapshot so
 * the page always renders a real, dated screen instead of a spinner. */

const API_BASE = import.meta.env.PUBLIC_ALPHADROP_API ?? "https://alphadrop-api.onrender.com";
const FETCH_TIMEOUT_MS = 12_000;

const snapshot = snapshotData as ScreenResponse;

/* ----------------------------- formatting ------------------------------ */

const fmtPct = (v: number | null | undefined, decimals = 0) =>
  v == null ? "—" : `${(v * 100).toFixed(decimals)}%`;

const fmtNum = (v: number | null | undefined, decimals = 1) =>
  v == null ? "—" : v.toFixed(decimals);

const fmtPrice = (v: number | null | undefined) =>
  v == null
    ? "—"
    : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

/* ------------------------------- columns ------------------------------- */

type SortKey =
  | "composite"
  | "pct_from_high"
  | "forward_pe"
  | "peg"
  | "ev_ebitda"
  | "roe"
  | "rev_growth_yoy"
  | "eps_cagr"
  | "debt_ebitda"
  | "fcf_yield";

interface MetricColumn {
  key: SortKey;
  label: string;
  get: (s: ScoredStock) => number | null;
  render: (s: ScoredStock) => string;
  /** For P/E-style columns, smaller is better → default ascending sort. */
  ascending?: boolean;
}

const METRIC_COLUMNS: MetricColumn[] = [
  {
    key: "pct_from_high",
    label: "% From 52w High",
    get: (s) => s.metrics.pct_from_high,
    render: (s) => (s.metrics.pct_from_high == null ? "—" : `−${fmtPct(s.metrics.pct_from_high)}`),
  },
  {
    key: "forward_pe",
    label: "Fwd P/E",
    get: (s) => s.metrics.forward_pe,
    render: (s) => fmtNum(s.metrics.forward_pe),
    ascending: true,
  },
  {
    key: "peg",
    label: "PEG",
    get: (s) => s.metrics.peg,
    render: (s) => fmtNum(s.metrics.peg, 2),
    ascending: true,
  },
  {
    key: "ev_ebitda",
    label: "EV/EBITDA",
    get: (s) => s.metrics.ev_ebitda,
    render: (s) => fmtNum(s.metrics.ev_ebitda),
    ascending: true,
  },
  { key: "roe", label: "ROE", get: (s) => s.metrics.roe, render: (s) => fmtPct(s.metrics.roe) },
  {
    key: "rev_growth_yoy",
    label: "Rev YoY",
    get: (s) => s.metrics.rev_growth_yoy,
    render: (s) => fmtPct(s.metrics.rev_growth_yoy),
  },
  {
    key: "eps_cagr",
    label: "EPS CAGR",
    get: (s) => s.metrics.eps_cagr,
    render: (s) =>
      s.metrics.eps_cagr == null
        ? "—"
        : `${fmtPct(s.metrics.eps_cagr)}${s.metrics.eps_cagr_years ? ` (${s.metrics.eps_cagr_years}y)` : ""}`,
  },
  {
    key: "debt_ebitda",
    label: "Debt/EBITDA",
    get: (s) => s.metrics.debt_ebitda,
    render: (s) => `${fmtNum(s.metrics.debt_ebitda)}x`,
    ascending: true,
  },
  {
    key: "fcf_yield",
    label: "FCF Yield",
    get: (s) => s.metrics.fcf_yield,
    render: (s) => fmtPct(s.metrics.fcf_yield, 1),
  },
];

/* ------------------------------ sub-pieces ------------------------------ */

const PILLARS = [
  { key: "value", label: "Value", max: 25, color: "var(--nb-teal)" },
  { key: "growth", label: "Growth", max: 25, color: "var(--nb-green)" },
  { key: "quality", label: "Quality", max: 25, color: "var(--nb-lavender)" },
  { key: "momentum", label: "Momentum", max: 25, color: "var(--nb-peach)" },
  { key: "bonus", label: "Drop Bonus", max: 10, color: "var(--nb-pink)" },
] as const;

function ScoreCell({ stock }: { stock: ScoredStock }) {
  return (
    <div className="flex min-w-[110px] flex-col gap-1.5">
      <span className="text-lg leading-none font-black">{stock.composite.toFixed(1)}</span>
      <div
        className="flex h-3 w-full overflow-hidden border-2 border-[var(--nb-ink)] bg-[var(--nb-base)]"
        role="img"
        aria-label={`Score breakdown: ${PILLARS.map((p) => `${p.label} ${stock.scores[p.key]}`).join(", ")}`}
      >
        {PILLARS.map((p) => (
          <span key={p.key} style={{ width: `${stock.scores[p.key]}%`, background: p.color }} />
        ))}
      </div>
    </div>
  );
}

function DrawdownBadge({ value }: { value: number | null }) {
  if (value == null) return <span>—</span>;
  const inWindow = value >= 0.15 && value <= 0.45;
  return (
    <span
      className={`inline-block border-2 border-[var(--nb-ink)] px-2 py-0.5 font-black whitespace-nowrap ${
        inWindow ? "bg-[var(--nb-peach)] text-[var(--nb-button-text)]" : "bg-[var(--nb-base)]"
      }`}
      title={inWindow ? "Inside the 15-45% drop-opportunity window" : "Outside the 15-45% window"}
    >
      −{fmtPct(value)}
    </span>
  );
}

function PillarBreakdown({ stock }: { stock: ScoredStock }) {
  const m = stock.metrics;
  const extras: [string, string][] = [
    ["P/B", fmtNum(m.price_to_book)],
    ["Op. margin", fmtPct(m.operating_margin)],
    ["Margin trend", m.margin_trend ?? "—"],
    ["1m return", fmtPct(m.ret_1m)],
    ["3m return", fmtPct(m.ret_3m)],
    ["Above 50d MA", m.above_ma50 == null ? "—" : m.above_ma50 ? "yes" : "no"],
    [
      "Analyst rating",
      m.recommendation_mean == null ? "—" : `${fmtNum(m.recommendation_mean, 1)} (1=Buy)`,
    ],
    ["Target upside", fmtPct(m.target_upside)],
    ["Market cap", m.market_cap == null ? "—" : `$${(m.market_cap / 1e9).toFixed(0)}B`],
    ["Data coverage", fmtPct(m.data_completeness)],
  ];

  return (
    <div className="grid gap-5 border-t-4 border-[var(--nb-ink)] bg-[var(--nb-base)] p-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        {PILLARS.map((p) => (
          <div
            key={p.key}
            className="grid grid-cols-[110px_1fr_54px] items-center gap-2 text-xs font-black uppercase"
          >
            <span>{p.label}</span>
            <div className="h-4 border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)]">
              <div
                className="h-full"
                style={{ width: `${(stock.scores[p.key] / p.max) * 100}%`, background: p.color }}
              />
            </div>
            <span className="text-right tabular-nums">
              {stock.scores[p.key]}/{p.max}
            </span>
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-bold sm:grid-cols-3">
        {extras.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] tracking-wider text-[var(--nb-muted)] uppercase">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------- dashboard ------------------------------ */

export function AlphaDropDashboard() {
  const [data, setData] = useState<ScreenResponse>(snapshot);
  const [source, setSource] = useState<"live" | "snapshot" | "loading">("loading");
  const [sortKey, setSortKey] = useState<SortKey>("composite");
  const [sortAsc, setSortAsc] = useState(false);
  const [dropWindowOnly, setDropWindowOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch(`${API_BASE}/screen?limit=15`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((payload: ScreenResponse) => {
        setData(payload);
        setSource("live");
      })
      .catch(() => setSource("snapshot"))
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const rows = useMemo(() => {
    let list = [...data.results];
    if (dropWindowOnly) {
      list = list.filter((s) => {
        const dd = s.metrics.pct_from_high;
        return dd != null && dd >= 0.15 && dd <= 0.45;
      });
    }
    const column = METRIC_COLUMNS.find((c) => c.key === sortKey);
    const get = sortKey === "composite" ? (s: ScoredStock) => s.composite : column!.get;
    list.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortAsc ? av - bv : bv - av;
    });
    return list;
  }, [data, dropWindowOnly, sortKey, sortAsc]);

  const toggleSort = (key: SortKey, ascendingByDefault: boolean) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(ascendingByDefault);
    }
  };

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortAsc ? " ↑" : " ↓") : "");

  const headerButton =
    "w-full cursor-pointer px-3 py-2 text-left text-[11px] font-black tracking-wider uppercase whitespace-nowrap hover:bg-[var(--nb-yellow)] hover:text-[var(--nb-button-text)]";

  return (
    <div className="flex flex-col gap-4">
      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase">
        <span className="border-2 border-[var(--nb-ink)] bg-[var(--nb-teal)] px-2.5 py-1 text-[var(--nb-button-text)] shadow-[2px_2px_0_0_var(--nb-ink)]">
          As of {fmtDate(data.as_of)}
        </span>
        <span className="border-2 border-[var(--nb-ink)] bg-[var(--nb-lavender)] px-2.5 py-1 text-[var(--nb-button-text)] shadow-[2px_2px_0_0_var(--nb-ink)]">
          Universe: {data.universe_size} stocks
        </span>
        <span className="border-2 border-[var(--nb-ink)] bg-[var(--nb-green)] px-2.5 py-1 text-[var(--nb-button-text)] shadow-[2px_2px_0_0_var(--nb-ink)]">
          {data.passed_filters} passed filters
        </span>
        <span
          className={`border-2 border-[var(--nb-ink)] px-2.5 py-1 text-[var(--nb-button-text)] shadow-[2px_2px_0_0_var(--nb-ink)] ${
            source === "live" ? "bg-[var(--nb-pink)]" : "bg-[var(--nb-yellow)]"
          }`}
          title={
            source === "live"
              ? "Fresh data from the AlphaDrop API"
              : "The API is waking up or offline — showing the bundled snapshot"
          }
        >
          {source === "loading"
            ? "Contacting API…"
            : source === "live"
              ? "● Live data"
              : "◍ Snapshot data"}
        </span>

        <label className="ml-auto flex cursor-pointer items-center gap-2 border-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] px-2.5 py-1 shadow-[2px_2px_0_0_var(--nb-ink)] select-none">
          <input
            type="checkbox"
            checked={dropWindowOnly}
            onChange={(e) => setDropWindowOnly(e.target.checked)}
            className="h-4 w-4 rounded-none border-2 border-[var(--nb-ink)] text-[var(--nb-peach)] focus:ring-0"
          />
          Drop window only (15–45%)
        </label>
      </div>

      {/* Opportunity table */}
      <div className="nb-panel overflow-x-auto p-0">
        <table className="w-full min-w-[1280px] border-collapse text-sm">
          <thead>
            <tr className="border-b-4 border-[var(--nb-ink)] bg-[var(--nb-surface)]">
              <th className="sticky left-0 z-10 bg-[var(--nb-surface)] px-3 py-2 text-left text-[11px] font-black tracking-wider uppercase">
                Ticker
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-black tracking-wider uppercase">
                Name
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-black tracking-wider uppercase">
                Sector
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-black tracking-wider uppercase">
                Price
              </th>
              {METRIC_COLUMNS.map((column) => (
                <th key={column.key} className="p-0 text-right">
                  <button
                    type="button"
                    className={`${headerButton} text-right`}
                    onClick={() => toggleSort(column.key, column.ascending ?? false)}
                  >
                    {column.label}
                    {sortIndicator(column.key)}
                  </button>
                </th>
              ))}
              <th className="p-0 text-left">
                <button
                  type="button"
                  className={headerButton}
                  onClick={() => toggleSort("composite", false)}
                >
                  Score{sortIndicator("composite")}
                </button>
              </th>
              <th className="min-w-[380px] px-3 py-2 text-left text-[11px] font-black tracking-wider uppercase">
                Thesis
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((stock, index) => {
              const m = stock.metrics;
              const isExpanded = expanded === m.ticker;
              return (
                <Fragment key={m.ticker}>
                  <tr
                    className={`cursor-pointer border-b-2 border-[var(--nb-ink)]/30 align-middle transition-colors hover:bg-[var(--nb-surface)] ${
                      isExpanded ? "bg-[var(--nb-surface)]" : ""
                    }`}
                    onClick={() => setExpanded(isExpanded ? null : m.ticker)}
                    title="Click to expand the pillar breakdown"
                  >
                    <td className="sticky left-0 z-10 bg-[var(--nb-base)] px-3 py-2.5 font-black">
                      <span className="text-[var(--nb-muted)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>{" "}
                      {m.ticker}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2.5 font-bold whitespace-nowrap">
                      {m.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-bold whitespace-nowrap text-[var(--nb-muted)]">
                      {m.sector ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                      {fmtPrice(m.price)}
                    </td>
                    {METRIC_COLUMNS.map((column) => (
                      <td
                        key={column.key}
                        className="px-3 py-2.5 text-right font-bold tabular-nums"
                      >
                        {column.key === "pct_from_high" ? (
                          <DrawdownBadge value={m.pct_from_high} />
                        ) : (
                          column.render(stock)
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2.5">
                      <ScoreCell stock={stock} />
                    </td>
                    <td className="min-w-[380px] px-3 py-2.5 text-xs leading-5 font-semibold text-[var(--nb-muted)]">
                      {stock.thesis}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b-2 border-[var(--nb-ink)]/30">
                      <td colSpan={4 + METRIC_COLUMNS.length + 2} className="p-0">
                        <PillarBreakdown stock={stock} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={4 + METRIC_COLUMNS.length + 2}
                  className="px-4 py-8 text-center font-bold"
                >
                  No stocks match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pillar legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-black uppercase">
        <span className="text-[var(--nb-muted)]">Score bar:</span>
        {PILLARS.map((p) => (
          <span key={p.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 border-2 border-[var(--nb-ink)]"
              style={{ background: p.color }}
            />
            {p.label} (0–{p.max})
          </span>
        ))}
      </div>
    </div>
  );
}
