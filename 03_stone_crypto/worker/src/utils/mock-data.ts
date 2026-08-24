import type {
  AssetBalance, ClosedTrade, DashboardResponse, MockData, Trade, AccountSummary,
  EquityPoint, DailyPnl, Position, SideStats, TagStats, DurationBucket,
  SizeBucket, CalendarDay, JournalEntry,
} from "../types"

// ─── Helpers ──────────────────────────────────────────────────────────────

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fmtHoldTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const s = Math.floor(Math.random() * 59)
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

function isoFromBase(base: Date, minutesAgo: number): string {
  return new Date(base.getTime() - minutesAgo * 60_000).toISOString()
}

const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "LINKUSDT",
  "ARBUSDT", "OPUSDT", "AVAXUSDT", "MATICUSDT", "ATOMUSDT",
  "NEARUSDT", "FTMUSDT",
] as const
const EXCHANGES = ["Binance", "Bybit"] as const
const ACCOUNTS = ["Main Account", "Alt Account", "Test Account"]
const STRATEGIES = [
  "Breakout", "Rejection", "Dip Buy", "Resistance",
  "Trend Follow", "Momentum", "Accumulation", "Swing",
]

const pnlSeed = [
  285.0, -124.5, 216.0, -42.0, 180.5, 68.0, 92.5, -26.0, 145.0, -52.0,
  320.0, -85.0, 95.0, 412.0, -38.0, 175.0, -210.0, 89.0, 530.0, -65.0,
  -180.0, 240.0, -112.0, 75.0, 360.0, 88.0, -195.0, 145.0, 620.0, -45.0,
  110.0, -275.0, 195.0, 85.0, 440.0, -155.0, 290.0, -90.0, 165.0, 50.0,
  -320.0, 280.0, -75.0, 510.0, 130.0, -240.0, 88.0, 350.0, -110.0, 470.0,
  95.0, -68.0, 310.0, -130.0, 85.0, 420.0, 55.0, -190.0, 230.0, -88.0,
]

// ─── Generate ClosedTrades (same as before, used by dashboard endpoint) ──

export function generateMockDashboard(): DashboardResponse {
  const now = Date.now()
  const day = 86400000

  const tradeConfigs: Array<{
    symbol: string; dir: "Long" | "Short"; size: number; pnl: number; r: number; hold: string
  }> = [
    { symbol: "BTCUSDT", dir: "Long", size: 0.15, pnl: 420, r: 2.8, hold: "6h 30m" },
    { symbol: "ETHUSDT", dir: "Short", size: 2.0, pnl: 210, r: 2.2, hold: "4h 15m" },
    { symbol: "SOLUSDT", dir: "Long", size: 15, pnl: 165, r: 1.9, hold: "3h 45m" },
    { symbol: "AVAXUSDT", dir: "Short", size: 60, pnl: 95, r: 1.4, hold: "2h 30m" },
    { symbol: "DOGEUSDT", dir: "Long", size: 8000, pnl: 52, r: 1.1, hold: "1h 20m" },
    { symbol: "LINKUSDT", dir: "Long", size: 80, pnl: 145, r: 1.7, hold: "5h 00m" },
    { symbol: "BTCUSDT", dir: "Short", size: 0.08, pnl: 85, r: 0.9, hold: "3h 10m" },
    { symbol: "ETHUSDT", dir: "Long", size: 1.5, pnl: -75, r: -1.1, hold: "2h 45m" },
    { symbol: "SOLUSDT", dir: "Short", size: 10, pnl: -42, r: -0.6, hold: "1h 50m" },
    { symbol: "AVAXUSDT", dir: "Long", size: 40, pnl: 112, r: 1.6, hold: "4h 20m" },
    { symbol: "LINKUSDT", dir: "Short", size: 50, pnl: -55, r: -0.8, hold: "3h 30m" },
    { symbol: "DOGEUSDT", dir: "Short", size: 12000, pnl: 88, r: 1.3, hold: "2h 10m" },
    { symbol: "MATICUSDT", dir: "Long", size: 500, pnl: 38, r: 0.7, hold: "1h 40m" },
    { symbol: "DOTUSDT", dir: "Short", size: 30, pnl: 72, r: 1.2, hold: "3h 00m" },
    { symbol: "ATOMUSDT", dir: "Long", size: 20, pnl: -28, r: -0.4, hold: "2h 20m" },
    { symbol: "ARBUSDT", dir: "Short", size: 200, pnl: 45, r: 0.8, hold: "1h 10m" },
  ]

  const exchanges: Array<"Binance" | "Bybit"> = ["Binance", "Bybit"]
  const accounts = ["Main Account", "Alt Account"]

  const closedTrades: ClosedTrade[] = tradeConfigs.map((t, i) => {
    const dayOffset = (tradeConfigs.length - 1 - i) * 1.8
    const tradeDate = new Date(now - dayOffset * day)
    const dateStr = tradeDate.toISOString()

    const exitPnl = t.pnl
    const entryPrice = t.dir === "Long" ? 10000 + i * 500 : 12000 - i * 300
    const exitPrice =
      t.dir === "Long"
        ? entryPrice + t.pnl / t.size
        : entryPrice - t.pnl / t.size

    return {
      id: tradeConfigs.length - i,
      symbol: t.symbol,
      dir: t.dir,
      size: t.size,
      entry: Math.round(entryPrice * 100) / 100,
      exit: Math.round(exitPrice * 100) / 100,
      holdTime: t.hold,
      realisedPnl: exitPnl,
      rMultiple: t.r,
      exchange: exchanges[i % 2],
      account: accounts[i % 2],
      entryTime: new Date(tradeDate.getTime() - 3600000).toISOString(),
      exitTime: dateStr,
      sequence: tradeConfigs.length - i,
      isWin: exitPnl > 0,
      isBreakeven: exitPnl === 0,
    }
  })

  const netWorth = closedTrades.reduce((sum, t) => sum + t.realisedPnl, 0) + 50000

  return {
    closedTrades,
    netWorth: Math.round(netWorth * 100) / 100,
    lastUpdated: new Date().toISOString(),
    accounts: [
      {
        exchange: "Binance",
        configured: true,
        valid: true,
        assets: generateMockAssets(),
      },
      {
        exchange: "Bybit",
        configured: true,
        valid: true,
        assets: [],
      },
    ],
  }
}

// ─── Full Mock Data (all frontend sections) ──────────────────────────────

function generateClosedTrades(): ClosedTrade[] {
  const now = new Date()
  const trades: ClosedTrade[] = []

  for (let i = 0; i < pnlSeed.length; i++) {
    const seq = pnlSeed.length - i
    const exchange = randomItem(EXCHANGES)
    const symbol = randomItem(SYMBOLS)
    const dir = Math.random() > 0.5 ? "Long" as const : "Short" as const
    const baseMinutes = i * 180 + Math.floor(Math.random() * 120)
    const hold = 30 + Math.floor(Math.random() * 420)
    const entryTime = isoFromBase(now, baseMinutes + hold)
    const exitTime = isoFromBase(now, baseMinutes)
    const entry = symbol === "BTCUSDT" ? 61000 + Math.random() * 4000
      : symbol === "ETHUSDT" ? 3200 + Math.random() * 300
      : symbol === "SOLUSDT" ? 130 + Math.random() * 20
      : symbol === "DOGEUSDT" ? 0.11 + Math.random() * 0.03
      : symbol === "LINKUSDT" ? 12 + Math.random() * 3
      : symbol === "AVAXUSDT" ? 28 + Math.random() * 6
      : 0.8 + Math.random() * 1.5
    const rawPnl = pnlSeed[i] * (0.7 + Math.random() * 0.6)
    const pnl = dir === "Long" ? rawPnl : -rawPnl
    const size = Math.random() > 0.6 ? 0.05 + Math.random() * 0.5 : 1 + Math.random() * 10
    const exit = dir === "Long" ? entry + (pnl / size) : entry - (pnl / size)

    const realisedPnl = Math.round(pnl * 100) / 100
    trades.push({
      id: seq,
      symbol,
      dir,
      size: Math.round(size * 1000) / 1000,
      entry: Math.round(entry * 100) / 100,
      exit: Math.round(exit * 100) / 100,
      holdTime: fmtHoldTime(hold),
      realisedPnl,
      rMultiple: Math.round((pnl / (Math.abs(pnl) + 1)) * 100) / 100,
      exchange: exchange as "Binance" | "Bybit",
      account: randomItem(ACCOUNTS),
      entryTime,
      exitTime,
      sequence: seq,
      isWin: realisedPnl > 0,
      isBreakeven: realisedPnl === 0,
    })
  }

  return trades.sort((a, b) => b.id - a.id)
}

function generateTradesFromClosed(closedTrades: ClosedTrade[]): Trade[] {
  return closedTrades.slice(0, 60).map((ct, i) => ({
    id: `t${i + 1}`,
    time: ct.exitTime.replace("Z", ""),
    pair: ct.symbol,
    side: ct.dir,
    price: ct.exit,
    qty: ct.size,
    pnl: ct.realisedPnl,
    roi: ct.rMultiple * 100,
    strategy: STRATEGIES[i % STRATEGIES.length] || "Swing",
    tags: [randomItem(["momentum", "breakout", "rejection", "dip-buy", "resistance", "support"])],
    duration: ct.holdTime,
    exchange: ct.exchange,
    fees: Math.round(Math.abs(ct.realisedPnl) * 0.01 * 100) / 100,
    notes: "",
  }))
}

function generateAccountSummary(closedTrades: ClosedTrade[]): AccountSummary {
  const wins = closedTrades.filter((t) => t.realisedPnl > 0)
  const losses = closedTrades.filter((t) => t.realisedPnl < 0)
  const grossPnl = wins.reduce((s, t) => s + t.realisedPnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realisedPnl, 0))
  const total = closedTrades.length

  return {
    netPnl: Math.round((grossPnl - grossLoss) * 100) / 100,
    grossPnl: Math.round(grossPnl * 100) / 100,
    grossLoss: Math.round(grossLoss * 100) / 100,
    winRate: total > 0 ? Math.round((wins.length / total) * 1000) / 10 : 0,
    profitFactor: grossLoss > 0 ? Math.round((grossPnl / grossLoss) * 100) / 100 : grossPnl > 0 ? Infinity : 0,
    totalTrades: total,
    winningTrades: wins.length,
    losingTrades: losses.length,
    avgWin: wins.length > 0 ? Math.round((grossPnl / wins.length) * 100) / 100 : 0,
    avgLoss: losses.length > 0 ? Math.round((grossLoss / losses.length) * 100) / 100 : 0,
    avgRRRatio: Math.round((wins.reduce((s, t) => s + t.rMultiple, 0) / (wins.length || 1)) * 100) / 100,
    bestTrade: wins.length > 0 ? Math.round(Math.max(...wins.map((t) => t.realisedPnl)) * 100) / 100 : 0,
    worstTrade: losses.length > 0 ? Math.round(Math.min(...losses.map((t) => t.realisedPnl)) * 100) / 100 : 0,
    currentBalance: 50000 + Math.round((grossPnl - grossLoss) * 10) / 10,
    openPositions: 4,
    avgTradeDuration: "3h 42m",
    totalFees: Math.round(total * 3.5 * 100) / 100,
    sharpeRatio: Math.round((1.2 + Math.random() * 0.5) * 100) / 100,
  }
}

function generateEquityCurve(): EquityPoint[] {
  return [
    { date: "2026-01", value: 42400 },
    { date: "2026-02", value: 41800 },
    { date: "2026-03", value: 43600 },
    { date: "2026-04", value: 42900 },
    { date: "2026-05", value: 45100 },
    { date: "2026-06", value: 44700 },
    { date: "2026-07", value: 55280 },
  ]
}

function generateDailyPnl(): DailyPnl[] {
  return [
    { date: "7/1", pnl: 420 },    { date: "7/2", pnl: -180 },   { date: "7/3", pnl: 650 },
    { date: "7/4", pnl: 320 },    { date: "7/5", pnl: -420 },   { date: "7/6", pnl: 180 },
    { date: "7/7", pnl: 780 },    { date: "7/8", pnl: -120 },   { date: "7/9", pnl: 540 },
    { date: "7/10", pnl: 260 },   { date: "7/11", pnl: -340 },  { date: "7/12", pnl: 490 },
    { date: "7/13", pnl: -90 },   { date: "7/14", pnl: 610 },   { date: "7/15", pnl: -240 },
    { date: "7/16", pnl: 380 },   { date: "7/17", pnl: 220 },   { date: "7/18", pnl: -160 },
    { date: "7/19", pnl: 450 },   { date: "7/20", pnl: 310 },   { date: "7/21", pnl: -280 },
    { date: "7/22", pnl: 190 },
  ]
}

function generatePositions(): Position[] {
  return [
    { id: "p1", pair: "BTCUSDT", side: "Long", size: 0.15, entry: 62350, mark: 64120, pnl: 265.50, roi: 2.84, leverage: 5, liquidation: 49880, unrealizedPnl: 265.50, exchange: "Binance" },
    { id: "p2", pair: "ETHUSDT", side: "Short", size: 2.5, entry: 3350, mark: 3210, pnl: 350.00, roi: 4.18, leverage: 3, liquidation: 3685, unrealizedPnl: 350.00, exchange: "Bybit" },
    { id: "p3", pair: "SOLUSDT", side: "Long", size: 8, entry: 142.5, mark: 138.2, pnl: -34.40, roi: -3.02, leverage: 2, liquidation: 99.8, unrealizedPnl: -34.40, exchange: "Binance" },
    { id: "p4", pair: "DOGEUSDT", side: "Long", size: 5000, entry: 0.1185, mark: 0.1245, pnl: 30.00, roi: 5.06, leverage: 1, liquidation: 0, unrealizedPnl: 30.00, exchange: "Binance" },
  ]
}

export function generateMockAssets(): AssetBalance[] {
  return [
    { symbol: "BTC", free: 0.15, locked: 0, priceUsdt: 64120, valueUsdt: 9618 },
    { symbol: "ETH", free: 2.5, locked: 0, priceUsdt: 3210, valueUsdt: 8025 },
    { symbol: "USDT", free: 12500, locked: 0, priceUsdt: 1, valueUsdt: 12500 },
    { symbol: "SOL", free: 8, locked: 0, priceUsdt: 138.2, valueUsdt: 1105.6 },
    { symbol: "BNB", free: 3.2, locked: 0, priceUsdt: 580, valueUsdt: 1856 },
    { symbol: "DOGE", free: 5000, locked: 0, priceUsdt: 0.1245, valueUsdt: 622.5 },
    { symbol: "LINK", free: 80, locked: 0, priceUsdt: 14.2, valueUsdt: 1136 },
    { symbol: "AVAX", free: 40, locked: 0, priceUsdt: 28.5, valueUsdt: 1140 },
  ]
}

function generateSideStats(): SideStats[] {
  return [
    { side: "Long", trades: 158, pnl: 7240.50, winRate: 62.0, avgRoi: 2.15, volume: 245000 },
    { side: "Short", trades: 126, pnl: 5606.82, winRate: 53.2, avgRoi: 1.60, volume: 188000 },
  ]
}

function generateTagStats(): TagStats[] {
  return [
    { tag: "breakout", trades: 48, wins: 30, losses: 18, winRate: 62.5, pnl: 3240.00, avgRoi: 2.40 },
    { tag: "rejection", trades: 36, wins: 24, losses: 12, winRate: 66.7, pnl: 2850.00, avgRoi: 2.85 },
    { tag: "dip-buy", trades: 42, wins: 22, losses: 20, winRate: 52.4, pnl: 980.00, avgRoi: 0.85 },
    { tag: "resistance", trades: 30, wins: 22, losses: 8, winRate: 73.3, pnl: 3200.00, avgRoi: 3.12 },
    { tag: "momentum", trades: 38, wins: 20, losses: 18, winRate: 52.6, pnl: 420.00, avgRoi: 0.35 },
    { tag: "trend", trades: 28, wins: 18, losses: 10, winRate: 64.3, pnl: 1850.00, avgRoi: 2.10 },
    { tag: "support", trades: 22, wins: 14, losses: 8, winRate: 63.6, pnl: 1200.00, avgRoi: 1.95 },
    { tag: "fakeout", trades: 18, wins: 6, losses: 12, winRate: 33.3, pnl: -820.00, avgRoi: -1.60 },
  ]
}

function generateDurationBuckets(): DurationBucket[] {
  return [
    { label: "< 1h", trades: 62, wins: 32, pnl: 1850.00, winRate: 51.6 },
    { label: "1-4h", trades: 98, wins: 62, pnl: 4850.00, winRate: 63.3 },
    { label: "4-24h", trades: 85, wins: 53, pnl: 5200.00, winRate: 62.4 },
    { label: "> 24h", trades: 39, wins: 18, pnl: 947.32, winRate: 46.2 },
  ]
}

function generateSizeBuckets(): SizeBucket[] {
  return [
    { label: "Small", trades: 120, wins: 72, pnl: 3850.00, winRate: 60.0, minSize: 0, maxSize: 0.05 },
    { label: "Medium", trades: 98, wins: 60, pnl: 5200.00, winRate: 61.2, minSize: 0.05, maxSize: 0.2 },
    { label: "Large", trades: 66, wins: 33, pnl: 3797.32, winRate: 50.0, minSize: 0.2, maxSize: 999 },
  ]
}

function generateCalendar(): CalendarDay[] {
  const pnlValues = [420, -180, 650, 320, -420, 180, 780, -120, 540, 260, -340, 490, -90, 610, -240, 380, 220, -160, 450, 310, -280, 190]
  const countValues = [3, 2, 4, 2, 2, 1, 3, 1, 3, 2, 2, 3, 1, 4, 2, 2, 3, 1, 3, 2, 2, 1]
  return pnlValues.map((pnl, i) => ({ day: i + 1, pnl, count: countValues[i] }))
}

function generateJournal(closedTrades: ClosedTrade[]): JournalEntry[] {
  return [
    { id: "j1", tradeId: "t1", trade: "DOGEUSDT", content: "Strong breakout on high volume. 15m chart showed clear flag pattern.", tags: ["breakout", "momentum"], chartUrls: [], createdAt: closedTrades[0]?.exitTime || new Date().toISOString(), confidence: 4, emotions: ["confident", "focused"] },
    { id: "j2", tradeId: "t2", trade: "BTCUSDT", content: "Hit resistance at 64000. Entered short but stop was too tight.", tags: ["rejection", "tight-stop"], chartUrls: [], createdAt: closedTrades[1]?.exitTime || new Date().toISOString(), confidence: 3, emotions: ["frustrated"] },
    { id: "j3", tradeId: "t3", trade: "ETHUSDT", content: "Perfect dip buy at support level. 1H chart showed clear support at 3260-3280 zone.", tags: ["dip-buy", "support", "perfect-entry"], chartUrls: [], createdAt: closedTrades[2]?.exitTime || new Date().toISOString(), confidence: 5, emotions: ["confident", "patient"] },
  ]
}

export function generateMockData(): MockData {
  const closedTrades = generateClosedTrades()
  const netWorth = closedTrades.reduce((sum, t) => sum + t.realisedPnl, 0) + 50000

  return {
    summary: generateAccountSummary(closedTrades),
    equityCurve: generateEquityCurve(),
    dailyPnl: generateDailyPnl(),
    positions: generatePositions(),
    trades: generateTradesFromClosed(closedTrades),
    sides: generateSideStats(),
    tags: generateTagStats(),
    durations: generateDurationBuckets(),
    sizes: generateSizeBuckets(),
    calendar: generateCalendar(),
    journal: generateJournal(closedTrades),
    closedTrades,
    assets: generateMockAssets(),
  }
}
