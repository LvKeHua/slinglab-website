import { useMemo } from "react"
import type { MockData, Trade, ClosedTrade, Position, AccountSummary, SideStats, TagStats, DurationBucket, SizeBucket, CalendarDay, JournalEntry } from "@/types"

// ─── Helpers ──────────────────────────────────────────────────────────────

function randomItem<T>(arr: T[]): T {
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
  const d = new Date(base.getTime() - minutesAgo * 60_000)
  return d.toISOString().replace('Z', '')
}

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'LINKUSDT', 'ARBUSDT', 'OPUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'NEARUSDT', 'FTMUSDT']
const EXCHANGES = ['Binance', 'Bybit'] as const
const ACCOUNTS = ['Main Account', 'Alt Account', 'Test Account']
const STRATEGIES = ['Breakout', 'Rejection', 'Dip Buy', 'Resistance', 'Trend Follow', 'Momentum', 'Accumulation', 'Swing']

function generateClosedTrades(): ClosedTrade[] {
  const now = new Date('2026-07-22T14:30:00')
  const trades: ClosedTrade[] = []
  const pnlSeed = [285.0, -124.5, 216.0, -42.0, 180.5, 68.0, 92.5, -26.0, 145.0, -52.0,
    320.0, -85.0, 95.0, 412.0, -38.0, 175.0, -210.0, 89.0, 530.0, -65.0,
    -180.0, 240.0, -112.0, 75.0, 360.0, 88.0, -195.0, 145.0, 620.0, -45.0,
    110.0, -275.0, 195.0, 85.0, 440.0, -155.0, 290.0, -90.0, 165.0, 50.0,
    -320.0, 280.0, -75.0, 510.0, 130.0, -240.0, 88.0, 350.0, -110.0, 470.0,
    95.0, -68.0, 310.0, -130.0, 85.0, 420.0, 55.0, -190.0, 230.0, -88.0,
  ]

  for (let i = 0; i < pnlSeed.length; i++) {
    const seq = pnlSeed.length - i
    const exchange = randomItem([...EXCHANGES])
    const symbol = randomItem(SYMBOLS)
    const dir = Math.random() > 0.5 ? 'Long' : 'Short'
    const baseMinutes = i * 180 + Math.floor(Math.random() * 120) // each trade ~3h apart
    const hold = 30 + Math.floor(Math.random() * 420) // hold 30min - 7.5h
    const entryTime = isoFromBase(now, baseMinutes + hold)
    const exitTime = isoFromBase(now, baseMinutes)
    const entry = symbol === 'BTCUSDT' ? 61000 + Math.random() * 4000 :
      symbol === 'ETHUSDT' ? 3200 + Math.random() * 300 :
      symbol === 'SOLUSDT' ? 130 + Math.random() * 20 :
      symbol === 'DOGEUSDT' ? 0.11 + Math.random() * 0.03 :
      symbol === 'LINKUSDT' ? 12 + Math.random() * 3 :
      symbol === 'AVAXUSDT' ? 28 + Math.random() * 6 :
      0.8 + Math.random() * 1.5
    const rawPnl = pnlSeed[i] * (0.7 + Math.random() * 0.6)
    const pnl = dir === 'Long' ? rawPnl : -rawPnl
    const size = Math.random() > 0.6 ? 0.05 + Math.random() * 0.5 : 1 + Math.random() * 10
    const exit = dir === 'Long' ? entry + (pnl / size) : entry - (pnl / size)

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
      exchange: exchange as 'Binance' | 'Bybit',
      account: randomItem(ACCOUNTS),
      entryTime,
      exitTime,
      sequence: seq,
      isWin: realisedPnl > 0,
      isBreakeven: realisedPnl === 0,
    })
  }

  // Sort by id descending (newest first)
  return trades.sort((a, b) => b.id - a.id)
}

function generateMockData(): MockData {
  const now = new Date('2026-07-22T14:30:00')
  const closedTrades = generateClosedTrades()

  const summary: AccountSummary = {
    netPnl: 12847.32,
    grossPnl: 35621.48,
    grossLoss: -22774.16,
    winRate: 58.3,
    profitFactor: 1.56,
    totalTrades: 284,
    winningTrades: 165,
    losingTrades: 119,
    avgWin: 215.89,
    avgLoss: -191.38,
    avgRRRatio: 1.13,
    bestTrade: 1240.50,
    worstTrade: -685.20,
    currentBalance: 55280.50,
    openPositions: 4,
    avgTradeDuration: "3h 42m",
    totalFees: 1284.60,
    sharpeRatio: 1.42,
  }

  const equityCurve = [
    { date: '2026-01', value: 42400 },
    { date: '2026-02', value: 41800 },
    { date: '2026-03', value: 43600 },
    { date: '2026-04', value: 42900 },
    { date: '2026-05', value: 45100 },
    { date: '2026-06', value: 44700 },
    { date: '2026-07', value: 55280 },
  ]

  const dailyPnl = [
    { date: '7/1', pnl: 420 }, { date: '7/2', pnl: -180 }, { date: '7/3', pnl: 650 },
    { date: '7/4', pnl: 320 }, { date: '7/5', pnl: -420 }, { date: '7/6', pnl: 180 },
    { date: '7/7', pnl: 780 }, { date: '7/8', pnl: -120 }, { date: '7/9', pnl: 540 },
    { date: '7/10', pnl: 260 }, { date: '7/11', pnl: -340 }, { date: '7/12', pnl: 490 },
    { date: '7/13', pnl: -90 }, { date: '7/14', pnl: 610 }, { date: '7/15', pnl: -240 },
    { date: '7/16', pnl: 380 }, { date: '7/17', pnl: 220 }, { date: '7/18', pnl: -160 },
    { date: '7/19', pnl: 450 }, { date: '7/20', pnl: 310 }, { date: '7/21', pnl: -280 },
    { date: '7/22', pnl: 190 },
  ]

  const positions: Position[] = [
    { id: 'p1', pair: 'BTCUSDT', side: 'Long', size: 0.15, entry: 62350, mark: 64120, pnl: 265.50, roi: 2.84, leverage: 5, liquidation: 49880, unrealizedPnl: 265.50, exchange: 'Binance' as const },
    { id: 'p2', pair: 'ETHUSDT', side: 'Short', size: 2.5, entry: 3350, mark: 3210, pnl: 350.00, roi: 4.18, leverage: 3, liquidation: 3685, unrealizedPnl: 350.00, exchange: 'Bybit' as const },
    { id: 'p3', pair: 'SOLUSDT', side: 'Long', size: 8, entry: 142.5, mark: 138.2, pnl: -34.40, roi: -3.02, leverage: 2, liquidation: 99.8, unrealizedPnl: -34.40, exchange: 'Binance' as const },
    { id: 'p4', pair: 'DOGEUSDT', side: 'Long', size: 5000, entry: 0.1185, mark: 0.1245, pnl: 30.00, roi: 5.06, leverage: 1, liquidation: 0, unrealizedPnl: 30.00, exchange: 'Bybit' as const },
  ]

  const trades: Trade[] = [
    { id: 't1', time: '2026-07-22T14:30', pair: 'DOGEUSDT', side: 'Long', price: 0.1245, qty: 5000, pnl: 85.00, roi: 1.36, strategy: 'Breakout', tags: ['momentum', 'breakout'], duration: '1h 20m', exchange: 'Binance', fees: 3.45, notes: 'Strong volume breakout on 15m chart' },
    { id: 't2', time: '2026-07-22T11:15', pair: 'BTCUSDT', side: 'Short', price: 63800, qty: 0.08, pnl: -124.50, roi: -2.44, strategy: 'Rejection', tags: ['rejection', 'key-level'], duration: '45m', exchange: 'Bybit', fees: 5.10, notes: 'Rejected at resistance, but stopped out too early' },
    { id: 't3', time: '2026-07-21T22:00', pair: 'ETHUSDT', side: 'Long', price: 3280, qty: 1.2, pnl: 216.00, roi: 5.49, strategy: 'Dip Buy', tags: ['dip-buy', 'support'], duration: '4h 30m', exchange: 'Binance', fees: 3.94, notes: 'Bought the dip at support level, worked perfectly' },
    { id: 't4', time: '2026-07-21T16:45', pair: 'ARBUSDT', side: 'Long', price: 0.85, qty: 200, pnl: -42.00, roi: -2.47, strategy: 'Momentum', tags: ['momentum', 'fomo'], duration: '2h', exchange: 'Bybit', fees: 0.34, notes: 'Chased the move, poor entry' },
    { id: 't5', time: '2026-07-21T09:30', pair: 'SOLUSDT', side: 'Short', price: 148.2, qty: 5, pnl: 180.50, roi: 2.44, strategy: 'Resistance', tags: ['resistance', 'top-pick'], duration: '5h 15m', exchange: 'Binance', fees: 1.48, notes: 'Clean resistance rejection, perfect short' },
    { id: 't6', time: '2026-07-20T20:15', pair: 'LINKUSDT', side: 'Long', price: 13.45, qty: 40, pnl: 68.00, roi: 1.26, strategy: 'Accumulation', tags: ['accumulation', 'low-risk'], duration: '6h', exchange: 'Bybit', fees: 0.54, notes: 'Slow grind up, held through minor pullback' },
    { id: 't7', time: '2026-07-20T13:00', pair: 'BTCUSDT', side: 'Long', price: 61500, qty: 0.05, pnl: 92.50, roi: 3.01, strategy: 'Trend Follow', tags: ['trend', 'breakout'], duration: '2h 45m', exchange: 'Binance', fees: 3.08, notes: 'Following the daily uptrend' },
    { id: 't8', time: '2026-07-20T08:20', pair: 'OPUSDT', side: 'Long', price: 1.82, qty: 100, pnl: -26.00, roi: -1.43, strategy: 'Breakout', tags: ['breakout', 'fakeout'], duration: '1h 10m', exchange: 'Binance', fees: 0.36, notes: 'Fake breakout, stopped out' },
    { id: 't9', time: '2026-07-19T15:00', pair: 'ETHUSDT', side: 'Short', price: 3420, qty: 1.0, pnl: 145.00, roi: 4.24, strategy: 'Rejection', tags: ['rejection', 'resistance'], duration: '3h 20m', exchange: 'Bybit', fees: 1.71, notes: 'Nice rejection at 3420 resistance' },
    { id: 't10', time: '2026-07-19T10:30', pair: 'SOLUSDT', side: 'Long', price: 135.0, qty: 10, pnl: -52.00, roi: -3.85, strategy: 'Dip Buy', tags: ['dip-buy', 'trend-fail'], duration: '2h 30m', exchange: 'Binance', fees: 1.35, notes: 'Trend broke down, bad dip buy' },
  ]

  const sides: SideStats[] = [
    { side: 'Long', trades: 158, pnl: 7240.50, winRate: 62.0, avgRoi: 2.15, volume: 245000 },
    { side: 'Short', trades: 126, pnl: 5606.82, winRate: 53.2, avgRoi: 1.60, volume: 188000 },
  ]

  const tags: TagStats[] = [
    { tag: 'breakout', trades: 48, wins: 30, losses: 18, winRate: 62.5, pnl: 3240.00, avgRoi: 2.40 },
    { tag: 'rejection', trades: 36, wins: 24, losses: 12, winRate: 66.7, pnl: 2850.00, avgRoi: 2.85 },
    { tag: 'dip-buy', trades: 42, wins: 22, losses: 20, winRate: 52.4, pnl: 980.00, avgRoi: 0.85 },
    { tag: 'resistance', trades: 30, wins: 22, losses: 8, winRate: 73.3, pnl: 3200.00, avgRoi: 3.12 },
    { tag: 'momentum', trades: 38, wins: 20, losses: 18, winRate: 52.6, pnl: 420.00, avgRoi: 0.35 },
    { tag: 'trend', trades: 28, wins: 18, losses: 10, winRate: 64.3, pnl: 1850.00, avgRoi: 2.10 },
    { tag: 'support', trades: 22, wins: 14, losses: 8, winRate: 63.6, pnl: 1200.00, avgRoi: 1.95 },
    { tag: 'fakeout', trades: 18, wins: 6, losses: 12, winRate: 33.3, pnl: -820.00, avgRoi: -1.60 },
  ]

  const durations: DurationBucket[] = [
    { label: '< 1h', trades: 62, wins: 32, pnl: 1850.00, winRate: 51.6 },
    { label: '1-4h', trades: 98, wins: 62, pnl: 4850.00, winRate: 63.3 },
    { label: '4-24h', trades: 85, wins: 53, pnl: 5200.00, winRate: 62.4 },
    { label: '> 24h', trades: 39, wins: 18, pnl: 947.32, winRate: 46.2 },
  ]

  const sizes: SizeBucket[] = [
    { label: 'Small', trades: 120, wins: 72, pnl: 3850.00, winRate: 60.0, minSize: 0, maxSize: 0.05 },
    { label: 'Medium', trades: 98, wins: 60, pnl: 5200.00, winRate: 61.2, minSize: 0.05, maxSize: 0.2 },
    { label: 'Large', trades: 66, wins: 33, pnl: 3797.32, winRate: 50.0, minSize: 0.2, maxSize: 999 },
  ]

  const pnlValues = [420, -180, 650, 320, -420, 180, 780, -120, 540, 260, -340, 490, -90, 610, -240, 380, 220, -160, 450, 310, -280, 190]
  const countValues = [3, 2, 4, 2, 2, 1, 3, 1, 3, 2, 2, 3, 1, 4, 2, 2, 3, 1, 3, 2, 2, 1]
  const calendar: CalendarDay[] = Array.from({ length: pnlValues.length }, (_, i) => ({
    day: i + 1,
    pnl: pnlValues[i],
    count: countValues[i],
  }))

  const journal: JournalEntry[] = [
    { id: 'j1', tradeId: 't1', trade: 'DOGEUSDT', content: 'Strong breakout on high volume. 15m chart showed clear flag pattern. Entered on the break of resistance with good momentum.', tags: ['breakout', 'momentum'], chartUrls: ['https://www.tradingview.com/x/example1/'], createdAt: '2026-07-22T14:35', confidence: 4, emotions: ['confident', 'focused'] },
    { id: 'j2', tradeId: 't2', trade: 'BTCUSDT', content: 'Hit resistance at 64000. Entered short but stop was too tight. Need to give trades more room next time.', tags: ['rejection', 'tight-stop'], chartUrls: [], createdAt: '2026-07-22T11:20', confidence: 3, emotions: ['frustrated'] },
    { id: 'j3', tradeId: 't3', trade: 'ETHUSDT', content: 'Perfect dip buy at support level. 1H chart showed clear support at 3260-3280 zone. Held through the bounce.', tags: ['dip-buy', 'support', 'perfect-entry'], chartUrls: ['https://www.tradingview.com/x/example3/'], createdAt: '2026-07-21T22:05', confidence: 5, emotions: ['confident', 'patient'] },
  ]

  return { summary, equityCurve, dailyPnl, positions, trades, sides, tags, durations, sizes, calendar, journal, closedTrades }
}

export function useMockData(): MockData {
  return useMemo(() => generateMockData(), [])
}
