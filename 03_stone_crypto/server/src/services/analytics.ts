/**
 * Analytics derivation — builds the stone frontend's MockData shape from
 * persisted ClosedTrades. Mirrors the frontend's pure analytics utils so the
 * /api/v1/data endpoint returns a complete payload without mock fallbacks.
 */
import type { ClosedTrade } from "./pairing.js";

export interface Trade {
  id: string;
  time: string;
  pair: string;
  side: "Long" | "Short";
  price: number;
  qty: number;
  pnl: number;
  roi: number;
  strategy: string;
  tags: string[];
  duration: string;
  exchange: string;
  fees: number;
  notes: string;
}

export interface AccountSummary {
  netPnl: number;
  grossPnl: number;
  grossLoss: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  avgRRRatio: number;
  bestTrade: number;
  worstTrade: number;
  currentBalance: number;
  openPositions: number;
  avgTradeDuration: string;
  totalFees: number;
  sharpeRatio: number;
}

export interface Position {
  id: string;
  pair: string;
  side: "Long" | "Short";
  size: number;
  entry: number;
  mark: number;
  pnl: number;
  roi: number;
  leverage: number;
  liquidation: number;
  unrealizedPnl: number;
  exchange?: string;
}

export interface SideStats {
  side: "Long" | "Short";
  trades: number;
  pnl: number;
  winRate: number;
  avgRoi: number;
  volume: number;
}

export interface TagStats {
  tag: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  avgRoi: number;
}

export interface DurationBucket {
  label: string;
  trades: number;
  wins: number;
  pnl: number;
  winRate: number;
}

export interface SizeBucket {
  label: string;
  trades: number;
  wins: number;
  pnl: number;
  winRate: number;
  minSize: number;
  maxSize: number;
}

export interface CalendarDay {
  day: number;
  pnl: number;
  count: number;
}

export interface JournalEntry {
  id: string;
  tradeId: string;
  trade: string;
  content: string;
  tags: string[];
  chartUrls: string[];
  createdAt: string;
  confidence: number;
  emotions: string[];
}

export interface MockData {
  summary: AccountSummary;
  equityCurve: Array<{ date: string; value: number }>;
  dailyPnl: Array<{ date: string; pnl: number }>;
  positions: Position[];
  trades: Trade[];
  sides: SideStats[];
  tags: TagStats[];
  durations: DurationBucket[];
  sizes: SizeBucket[];
  calendar: CalendarDay[];
  journal: JournalEntry[];
  closedTrades: ClosedTrade[];
  assets?: Array<{ symbol: string; free: number; locked: number; valueUsdt: number; priceUsdt: number }>;
}

function parseHoldMs(holdTime: string): number {
  let ms = 0;
  const h = holdTime.match(/(\d+)h/);
  const m = holdTime.match(/(\d+)m(?!s)/);
  const s = holdTime.match(/(\d+)s/);
  if (h) ms += Number(h[1]) * 3_600_000;
  if (m) ms += Number(m[1]) * 60_000;
  if (s) ms += Number(s[1]) * 1000;
  return ms;
}

function formatHoldShort(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function buildMockData(
  trades: ClosedTrade[],
  journal: JournalEntry[],
  assets: MockData["assets"] = [],
): MockData {
  const wins = trades.filter((t) => t.isWin);
  const losses = trades.filter((t) => !t.isWin && !t.isBreakeven);
  const netPnl = trades.reduce((s, t) => s + t.realisedPnl, 0);
  const grossPnl = wins.reduce((s, t) => s + t.realisedPnl, 0);
  const grossLoss = losses.reduce((s, t) => s + t.realisedPnl, 0);
  const totalFees = trades.reduce((s, t) => s + Math.abs(t.entry - t.exit) * t.size * 0.001, 0);

  const summary: AccountSummary = {
    netPnl: Math.round(netPnl * 100) / 100,
    grossPnl: Math.round(grossPnl * 100) / 100,
    grossLoss: Math.round(grossLoss * 100) / 100,
    winRate: trades.length > 0 ? Math.round((wins.length / trades.length) * 1000) / 10 : 0,
    profitFactor: grossLoss < 0 ? Math.round((grossPnl / Math.abs(grossLoss)) * 100) / 100 : 0,
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    avgWin: wins.length > 0 ? Math.round((grossPnl / wins.length) * 100) / 100 : 0,
    avgLoss: losses.length > 0 ? Math.round((grossLoss / losses.length) * 100) / 100 : 0,
    avgRRRatio: 0,
    bestTrade: trades.length > 0 ? Math.max(...trades.map((t) => t.realisedPnl)) : 0,
    worstTrade: trades.length > 0 ? Math.min(...trades.map((t) => t.realisedPnl)) : 0,
    currentBalance: 50000 + netPnl,
    openPositions: 0,
    avgTradeDuration:
      trades.length > 0
        ? formatHoldShort(trades.reduce((s, t) => s + parseHoldMs(t.holdTime), 0) / trades.length)
        : "0s",
    totalFees: Math.round(totalFees * 100) / 100,
    sharpeRatio: 0,
  };

  // Equity curve: cumulative PnL by month
  const byMonth = new Map<string, number>();
  for (const t of trades) {
    const key = t.exitTime.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + t.realisedPnl);
  }
  const equityCurve = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, pnl]) => ({ date, value: Math.round((50000 + pnl) * 100) / 100 }));

  // Daily PnL
  const byDay = new Map<string, number>();
  for (const t of trades) {
    const key = t.exitTime.slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + t.realisedPnl);
  }
  const dailyPnl = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, pnl]) => ({ date: date.slice(5), pnl: Math.round(pnl * 100) / 100 }));

  // Trades (Trade[] shape for the Trades page)
  const tradeRows: Trade[] = trades.map((t, i) => ({
    id: `t${i + 1}`,
    time: t.exitTime,
    pair: t.symbol,
    side: t.dir,
    price: t.exit,
    qty: t.size,
    pnl: t.realisedPnl,
    roi: t.entry > 0 ? Math.round((t.realisedPnl / (t.size * t.entry)) * 10000) / 100 : 0,
    strategy: "Manual",
    tags: [],
    duration: t.holdTime,
    exchange: t.exchange,
    fees: 0,
    notes: "",
  }));

  // Sides
  const sides: SideStats[] = (["Long", "Short"] as const).map((side) => {
    const list = trades.filter((t) => t.dir === side);
    const sideWins = list.filter((t) => t.isWin).length;
    const pnl = list.reduce((s, t) => s + t.realisedPnl, 0);
    return {
      side,
      trades: list.length,
      pnl: Math.round(pnl * 100) / 100,
      winRate: list.length > 0 ? Math.round((sideWins / list.length) * 1000) / 10 : 0,
      avgRoi: 0,
      volume: Math.round(list.reduce((s, t) => s + t.size * t.entry, 0) * 100) / 100,
    };
  });

  // Tags (from journal entries)
  const tagMap = new Map<string, { trades: number; wins: number; losses: number; pnl: number }>();
  for (const entry of journal) {
    for (const tag of entry.tags) {
      const stat = tagMap.get(tag) ?? { trades: 0, wins: 0, losses: 0, pnl: 0 };
      stat.trades++;
      tagMap.set(tag, stat);
    }
  }
  const tags: TagStats[] = [...tagMap.entries()].map(([tag, stat]) => ({
    tag,
    trades: stat.trades,
    wins: stat.wins,
    losses: stat.losses,
    winRate: stat.trades > 0 ? Math.round((stat.wins / stat.trades) * 1000) / 10 : 0,
    pnl: Math.round(stat.pnl * 100) / 100,
    avgRoi: 0,
  }));

  // Duration buckets
  const durationBuckets = [
    { label: "< 1h", min: 0, max: 3_600_000 },
    { label: "1-4h", min: 3_600_000, max: 14_400_000 },
    { label: "4-24h", min: 14_400_000, max: 86_400_000 },
    { label: "> 24h", min: 86_400_000, max: Infinity },
  ];
  const durations: DurationBucket[] = durationBuckets.map((bucket) => {
    const list = trades.filter((t) => {
      const ms = parseHoldMs(t.holdTime);
      return ms >= bucket.min && ms < bucket.max;
    });
    const bucketWins = list.filter((t) => t.isWin).length;
    return {
      label: bucket.label,
      trades: list.length,
      wins: bucketWins,
      pnl: Math.round(list.reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100,
      winRate: list.length > 0 ? Math.round((bucketWins / list.length) * 1000) / 10 : 0,
    };
  });

  // Size buckets
  const sizeBuckets = [
    { label: "Small", min: 0, max: 0.05 },
    { label: "Medium", min: 0.05, max: 0.2 },
    { label: "Large", min: 0.2, max: Infinity },
  ];
  const sizes: SizeBucket[] = sizeBuckets.map((bucket) => {
    const list = trades.filter((t) => t.size >= bucket.min && t.size < bucket.max);
    const bucketWins = list.filter((t) => t.isWin).length;
    return {
      label: bucket.label,
      trades: list.length,
      wins: bucketWins,
      pnl: Math.round(list.reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100,
      winRate: list.length > 0 ? Math.round((bucketWins / list.length) * 1000) / 10 : 0,
      minSize: bucket.min,
      maxSize: bucket.max === Infinity ? 999 : bucket.max,
    };
  });

  // Calendar (last 30 days)
  const calendar: CalendarDay[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const dayTrades = trades.filter((t) => t.exitTime.slice(0, 10) === key);
    calendar.push({
      day: d.getDate(),
      pnl: Math.round(dayTrades.reduce((s, t) => s + t.realisedPnl, 0) * 100) / 100,
      count: dayTrades.length,
    });
  }

  return {
    summary,
    equityCurve,
    dailyPnl,
    positions: [],
    trades: tradeRows,
    sides,
    tags,
    durations,
    sizes,
    calendar,
    journal,
    closedTrades: trades,
    assets,
  };
}
