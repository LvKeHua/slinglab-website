export interface Position {
  id: number;
  symbol: string;
  price: string;
  amount: string;
  entry: string;
  account: string;
  unrealizedPnl: number;
}

export interface Asset {
  asset: string;
  amount: number;
  avgEntry: number;
  currentPrice: number;
  value: number;
  pnl: number;
}

export interface ClosedTrade {
  id: number;
  symbol: string;
  dir: 'Long' | 'Short';
  size: string;
  holdTime: string;
  date: string; // YYYY-MM-DD
  entry: number;
  exit: number;
  realisedPnl: number;
  rMultiple?: number;
}

export type Filter = 'week' | 'month' | 'year' | 'all';

export function filterTrades(trades: ClosedTrade[], filter: Filter): ClosedTrade[] {
  const now = new Date();
  return trades.filter((t) => {
    if (filter === 'all') return true;
    const d = new Date(t.date);
    const diff = now.getTime() - d.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    switch (filter) {
      case 'week': return days <= 7;
      case 'month': return days <= 30;
      case 'year': return days <= 365;
      default: return true;
    }
  });
}

export interface ExchangeKeys {
  apiKey: string;
  secretKey: string;
}

export interface ExchangeStatus {
  configured: boolean;
  valid: boolean;
}

export interface SettingsStatus {
  binance: ExchangeStatus;
  bybit: ExchangeStatus;
}

export interface AppState {
  positions: Position[];
  assets: Asset[];
  closedTrades: ClosedTrade[];
  netWorth: number;
  userName: string;
  sidebarCollapsed: boolean;
  filter: Filter;
  lastUpdated: string;
  syncing: boolean;
  /* settings */
  binanceConfigured: boolean;
  binanceValid: boolean;
  bybitConfigured: boolean;
  bybitValid: boolean;
  /* actions */
  loadSampleData: () => void;
  clearData: () => void;
  setFilter: (f: Filter) => void;
  toggleSidebar: () => void;
  saveToBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
  syncFromExchange: () => Promise<void>;
  saveApiKeys: (exchange: 'binance' | 'bybit', keys: ExchangeKeys) => Promise<void>;
  testConnection: (exchange: 'binance' | 'bybit', keys: ExchangeKeys) => Promise<boolean>;
  loadKeyStatus: () => Promise<void>;
  clearKeys: (exchange: 'binance' | 'bybit') => Promise<void>;
}

export interface DashboardData {
  positions: Position[];
  assets: Asset[];
  closedTrades: ClosedTrade[];
  netWorth: number;
}
