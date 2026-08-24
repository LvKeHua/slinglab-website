const API_BASE = import.meta.env.VITE_API_URL || '/stone/api';

export interface DashboardData {
  positions: unknown[];
  assets: unknown[];
  closedTrades: unknown[];
  netWorth: number;
  lastUpdated: string;
}

export interface SettingsStatus {
  binance: { configured: boolean; valid: boolean };
  bybit: { configured: boolean; valid: boolean };
}

export const api = {
  getDashboard: (): Promise<DashboardData> =>
    fetch(`${API_BASE}/v1/dashboard`).then((r) => {
      if (!r.ok) throw new Error('No data');
      return r.json();
    }),

  syncDashboard: (): Promise<{ ok: boolean; lastUpdated: string }> =>
    fetch(`${API_BASE}/v1/sync`, { method: 'POST' }).then((r) => {
      if (!r.ok) throw new Error('Sync failed');
      return r.json();
    }),

  saveDashboard: (data: DashboardData): Promise<{ ok: boolean }> =>
    fetch(`${API_BASE}/dashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  saveKeys: (exchange: 'binance' | 'bybit', apiKey: string, secretKey: string): Promise<{ success: boolean }> =>
    fetch(`${API_BASE}/v1/settings/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchange, apiKey, secretKey }),
    }).then((r) => r.json()),

  testConnection: (exchange: 'binance' | 'bybit', apiKey: string, secretKey: string): Promise<{ success: boolean; error?: string }> =>
    fetch(`${API_BASE}/v1/settings/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchange, apiKey, secretKey }),
    }).then((r) => r.json()),

  getKeyStatus: (): Promise<SettingsStatus> =>
    fetch(`${API_BASE}/v1/settings/status`).then((r) => r.json()),

  clearKeys: (exchange: 'binance' | 'bybit'): Promise<{ success: boolean }> =>
    fetch(`${API_BASE}/v1/settings/keys`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchange }),
    }).then((r) => r.json()),
};
