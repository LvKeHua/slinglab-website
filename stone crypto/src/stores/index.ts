import { create } from "zustand"
import type { TradeFilter, PerformanceFilter, BreakevenFilter, DirectionFilter, DashboardTab, DashboardTimeRange, Position, Asset, ClosedTrade, ReportingFilter, AccountInfo, AssetBalance } from "@/types"
import type { AnalyticsTimeRange } from "@/utils/analytics"
import { getDashboardResponse, getDashboardData } from "@/lib/api-client"
import { filterDashboardTrades } from "@/lib/time-filters"

interface TradeStore {
  filter: TradeFilter
  setFilter: (filter: Partial<TradeFilter>) => void
  resetFilter: () => void
}

const defaultFilter: TradeFilter = {
  search: "",
  side: "All",
  dateRange: [null, null],
  strategy: "",
  tag: "",
  sortBy: "time",
  sortOrder: "desc",
  account: "All Accounts",
  symbol: "All Symbols",
  limit: 50,
}

export const useTradeStore = create<TradeStore>((set) => ({
  filter: defaultFilter,
  setFilter: (partial) => set((state) => ({ filter: { ...state.filter, ...partial } })),
  resetFilter: () => set({ filter: defaultFilter }),
}))

// ─── Performance Page Filters ─────────────────────────────────────────────

const defaultPerfFilter: PerformanceFilter = {
  account: "All Accounts",
  symbol: "All Symbols",
  limit: 50,
  timeRange: "this-month",
  sortBy: "time",
  sortOrder: "desc",
  breakevenFilter: "all",
  directionFilter: "all",
}

interface PerformanceStore {
  perfFilter: PerformanceFilter
  setPerfFilter: (partial: Partial<PerformanceFilter>) => void
  resetPerfFilter: () => void
  selectedCalendarDate: string | null
  setSelectedCalendarDate: (date: string | null) => void
}

export const usePerformanceStore = create<PerformanceStore>((set) => ({
  perfFilter: defaultPerfFilter,
  setPerfFilter: (partial) =>
    set((state) => ({ perfFilter: { ...state.perfFilter, ...partial } })),
  resetPerfFilter: () => set({ perfFilter: defaultPerfFilter }),
  selectedCalendarDate: null,
  setSelectedCalendarDate: (date) => set({ selectedCalendarDate: date }),
}))

// ─── Dashboard Store (CMM-style) ──────────────────────────────────────────

interface DashboardStore {
  positions: Position[]
  assets: Asset[]
  accounts: AccountInfo[]
  closedTrades: ClosedTrade[]
  filteredClosedTrades: ClosedTrade[]
  netWorth: number
  userName: string
  dashboardTab: DashboardTab
  dashboardTimeRange: DashboardTimeRange
  dashboardAccount: string
  dashboardSymbol: string
  dashboardLimit: number
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  lastUpdated: string | null
  setDashboardTab: (tab: DashboardTab) => void
  setDashboardTimeRange: (range: DashboardTimeRange) => void
  setDashboardFilter: (partial: Partial<{ dashboardAccount: string; dashboardSymbol: string; dashboardLimit: number }>) => void
  loadFromBackend: () => Promise<void>
  syncFromExchange: () => Promise<void>
}

/** Convert AssetBalance[] from an AccountInfo to Asset[] for the table */
function assetBalancesToAssets(accounts: AccountInfo[]): Asset[] {
  const allBalances: Asset[] = []
  for (const account of accounts) {
    if (!account.valid || account.error) continue
    for (const b of account.assets) {
      allBalances.push({
        symbol: b.symbol,
        name: b.symbol,
        price: b.priceUsdt,
        change24h: 0,
        volume24h: 0,
        spread: 0,
        holdings: b.free + b.locked,
        value: b.valueUsdt,
        unrealizedPnl: 0,
        side: 'Long',
        exchange: account.exchange,
      })
    }
  }
  return allBalances
}

/** Convert mock AssetBalance[] to Asset[] (no exchange tag since it's fallback data) */
function mockAssetsToDisplay(balances: AssetBalance[]): Asset[] {
  return balances.map((b) => ({
    symbol: b.symbol,
    name: b.symbol,
    price: b.priceUsdt,
    change24h: 0,
    volume24h: 0,
    spread: 0,
    holdings: b.free + b.locked,
    value: b.valueUsdt,
    unrealizedPnl: 0,
    side: 'Long' as const,
  }))
}

function computeFiltered(trades: ClosedTrade[], range: DashboardTimeRange, account?: string, symbol?: string, limit?: number): ClosedTrade[] {
  let result = filterDashboardTrades(trades, range)
  if (account && account !== "All Accounts") {
    result = result.filter(t => t.exchange === account)
  }
  if (symbol && symbol !== "All Symbols") {
    result = result.filter(t => t.symbol === symbol)
  }
  // Limit is a row cap — stats use the full filtered set
  // We return the full filtered set; the component applies the limit for display
  return result
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  positions: [],
  assets: [],
  accounts: [],
  closedTrades: [],
  filteredClosedTrades: [],
  netWorth: 0,
  userName: "Trader",
  dashboardTab: "positions",
  dashboardTimeRange: "this-week",
  dashboardAccount: "All Accounts",
  dashboardSymbol: "All Symbols",
  dashboardLimit: 50,
  isLoading: false,
  isSyncing: false,
  error: null,
  lastUpdated: null,

  setDashboardTab: (tab) => set({ dashboardTab: tab }),

  setDashboardTimeRange: (range) => {
    const { closedTrades, dashboardAccount, dashboardSymbol, dashboardLimit } = get()
    set({ dashboardTimeRange: range, filteredClosedTrades: computeFiltered(closedTrades, range, dashboardAccount, dashboardSymbol, dashboardLimit) })
  },

  setDashboardFilter: (partial) => set((state) => {
    const updates = { ...partial }
    // Reset symbol when account changes
    if (partial.dashboardAccount !== undefined && partial.dashboardAccount !== state.dashboardAccount) {
      updates.dashboardSymbol = "All Symbols"
    }
    return { ...updates, filteredClosedTrades: computeFiltered(state.closedTrades, state.dashboardTimeRange, updates.dashboardAccount ?? state.dashboardAccount, updates.dashboardSymbol ?? state.dashboardSymbol, updates.dashboardLimit ?? state.dashboardLimit) }
  }),

  loadFromBackend: async () => {
    set({ isLoading: true, error: null })
    try {
      const [dashboardResp, mockData] = await Promise.all([
        getDashboardResponse(),
        getDashboardData(),
      ])
      const closedTrades = dashboardResp.closedTrades
      const accounts = dashboardResp.accounts ?? []
      const assetsFromAccounts = assetBalancesToAssets(accounts)
      const { dashboardTimeRange, dashboardAccount, dashboardSymbol, dashboardLimit } = get()
      set({
        closedTrades,
        filteredClosedTrades: computeFiltered(closedTrades, dashboardTimeRange, dashboardAccount, dashboardSymbol, dashboardLimit),
        netWorth: dashboardResp.netWorth,
        lastUpdated: dashboardResp.lastUpdated,
        positions: dashboardResp.openPositions?.map(p => ({
          id: `${p.exchange}-${p.symbol}-${p.side}`,
          pair: p.symbol.replace('USDT', '/USDT'),
          side: p.side,
          size: p.size,
          entry: p.entryPrice,
          mark: p.markPrice,
          pnl: p.unrealizedPnl,
          roi: p.entryPrice > 0 ? (p.unrealizedPnl / (p.size * p.entryPrice)) * 100 : 0,
          leverage: p.leverage,
          liquidation: p.liquidationPrice,
          unrealizedPnl: p.unrealizedPnl,
          exchange: p.exchange,
        })) ?? mockData.positions,
        accounts,
        assets: assetsFromAccounts.length > 0 ? assetsFromAccounts : mockAssetsToDisplay(mockData.assets ?? []),
        isLoading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load dashboard data",
        isLoading: false,
      })
    }
  },

  syncFromExchange: async () => {
    set({ isSyncing: true, error: null })
    try {
      const [dashboardResp, mockData] = await Promise.all([
        getDashboardResponse(),
        getDashboardData(),
      ])
      const closedTrades = dashboardResp.closedTrades
      const accounts = dashboardResp.accounts ?? []
      const assetsFromAccounts = assetBalancesToAssets(accounts)
      const { dashboardTimeRange, dashboardAccount, dashboardSymbol, dashboardLimit } = get()
      set({
        closedTrades,
        filteredClosedTrades: computeFiltered(closedTrades, dashboardTimeRange, dashboardAccount, dashboardSymbol, dashboardLimit),
        netWorth: dashboardResp.netWorth,
        lastUpdated: dashboardResp.lastUpdated,
        positions: dashboardResp.openPositions?.map(p => ({
          id: `${p.exchange}-${p.symbol}-${p.side}`,
          pair: p.symbol.replace('USDT', '/USDT'),
          side: p.side,
          size: p.size,
          entry: p.entryPrice,
          mark: p.markPrice,
          pnl: p.unrealizedPnl,
          roi: p.entryPrice > 0 ? (p.unrealizedPnl / (p.size * p.entryPrice)) * 100 : 0,
          leverage: p.leverage,
          liquidation: p.liquidationPrice,
          unrealizedPnl: p.unrealizedPnl,
          exchange: p.exchange,
        })) ?? mockData.positions,
        accounts,
        assets: assetsFromAccounts.length > 0 ? assetsFromAccounts : mockAssetsToDisplay(mockData.assets ?? []),
        isSyncing: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to sync from exchange",
        isSyncing: false,
      })
    }
  },
}))

// ─── Analytics Store ────────────────────────────────────────────────────────

export interface AnalyticsFilter {
  account: string
  symbol: string
  lastN: number
  timeRange: AnalyticsTimeRange
  breakevenFilter: BreakevenFilter
  directionFilter: DirectionFilter
  groupBy: 'open' | 'close'
}

const defaultAnalyticsFilter: AnalyticsFilter = {
  account: "All Accounts",
  symbol: "All Symbols",
  lastN: 50,
  timeRange: "this-month",
  breakevenFilter: "all",
  directionFilter: "all",
  groupBy: "open",
}

interface AnalyticsStore {
  analyticsFilter: AnalyticsFilter
  setAnalyticsFilter: (partial: Partial<AnalyticsFilter>) => void
  resetAnalyticsFilter: () => void
}

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  analyticsFilter: defaultAnalyticsFilter,
  setAnalyticsFilter: (partial) =>
    set((state) => ({ analyticsFilter: { ...state.analyticsFilter, ...partial } })),
  resetAnalyticsFilter: () => set({ analyticsFilter: defaultAnalyticsFilter }),
}))


// ── Reporting Store ────────────────────────────────────────────────────────

const defaultReportingFilter: ReportingFilter = {
  account: "All Accounts",
  symbol: "All Symbols",
  timeRange: "this-month",
  customStartDate: null,
  customEndDate: null,
  groupBy: "close",
}

interface ReportingStore {
  reportingFilter: ReportingFilter
  setReportingFilter: (partial: Partial<ReportingFilter>) => void
  resetReportingFilter: () => void
}

export const useReportingStore = create<ReportingStore>((set) => ({
  reportingFilter: defaultReportingFilter,
  setReportingFilter: (partial) =>
    set((state) => ({ reportingFilter: { ...state.reportingFilter, ...partial } })),
  resetReportingFilter: () => set({ reportingFilter: defaultReportingFilter }),
}))