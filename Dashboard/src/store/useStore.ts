import { create } from 'zustand';
import type { Position, Asset, ClosedTrade, Filter, AppState, ExchangeKeys } from '../types';
import { filterTrades } from '../types';
import { api } from '../lib/api';

const SIDEBAR_KEY = 'cmm_sidebar_collapsed';

function getInitialSidebar(): boolean {
  try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; } catch { return false; }
}

export const useStore = create<AppState>((set, get) => ({
  positions: [],
  assets: [],
  closedTrades: [],
  netWorth: 50834.07,
  userName: 'kehual Demo',
  sidebarCollapsed: getInitialSidebar(),
  filter: 'month',
  lastUpdated: '',
  syncing: false,
  /* settings */
  binanceConfigured: false,
  binanceValid: false,
  bybitConfigured: false,
  bybitValid: false,

  loadSampleData: () => {
    set({
      positions: [],
      assets: [],
      closedTrades: [],
    });
  },

  clearData: () => {
    set({ positions: [], assets: [], closedTrades: [], netWorth: 50834.07 });
  },

  setFilter: (f: Filter) => set({ filter: f }),

  toggleSidebar: () => {
    set((s) => {
      const next = !s.sidebarCollapsed;
      try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch {}
      return { sidebarCollapsed: next };
    });
  },

  loadFromBackend: async () => {
    try {
      const data = await api.getDashboard();
      set({
        positions: data.positions as Position[],
        assets: data.assets as Asset[],
        closedTrades: data.closedTrades as ClosedTrade[],
        netWorth: data.netWorth,
        lastUpdated: data.lastUpdated,
      });
    } catch {
      // No backend data yet — will auto-sync on first visit
    }
  },

  syncFromExchange: async () => {
    set({ syncing: true });
    try {
      const result = await api.syncDashboard();
      await get().loadFromBackend();
      set({ syncing: false, lastUpdated: result.lastUpdated });
    } catch {
      set({ syncing: false });
    }
  },

  saveToBackend: async () => {
    const s = get();
    const data = { positions: s.positions, assets: s.assets, closedTrades: s.closedTrades, netWorth: s.netWorth };
    try {
      await api.saveDashboard(data);
    } catch { /* backend may be unavailable */ }
  },

  /* ---- Settings ---- */

  saveApiKeys: async (exchange, keys) => {
    const r = await api.saveKeys(exchange, keys.apiKey, keys.secretKey);
    if (r.success) {
      set(
        exchange === 'binance'
          ? { binanceConfigured: true, binanceValid: false }
          : { bybitConfigured: true, bybitValid: false }
      );
    }
  },

  testConnection: async (exchange, keys) => {
    const r = await api.testConnection(exchange, keys.apiKey, keys.secretKey);
    if (r.success) {
      set(
        exchange === 'binance'
          ? { binanceValid: true }
          : { bybitValid: true }
      );
    } else {
      set(
        exchange === 'binance'
          ? { binanceValid: false }
          : { bybitValid: false }
      );
    }
    return r.success;
  },

  loadKeyStatus: async () => {
    try {
      const s = await api.getKeyStatus();
      set({
        binanceConfigured: s.binance.configured,
        binanceValid: s.binance.valid,
        bybitConfigured: s.bybit.configured,
        bybitValid: s.bybit.valid,
      });
    } catch { /* backend down */ }
  },

  clearKeys: async (exchange) => {
    const r = await api.clearKeys(exchange);
    if (r.success) {
      set(
        exchange === 'binance'
          ? { binanceConfigured: false, binanceValid: false }
          : { bybitConfigured: false, bybitValid: false }
      );
    }
  },
}));
