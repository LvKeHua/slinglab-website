import type { SettingsStatus, ExchangeKeys, MockData, DashboardResponse } from "@/types"

// API base URL — self-hosted local backend (Fastify on :8766).
// In dev, Next.js rewrites /api/* to the local server; in production the
// frontend is served from the same origin as the backend.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Accounts & groups ───────────────────────────────────────────────────────

export interface AccountOut {
  id: number
  exchange: string
  name: string
  group: string | null
  groupId: number | null
  hasApiKey: boolean
  hasSecret: boolean
  hasPassphrase: boolean
  walletAddress: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface GroupOut {
  id: number
  name: string
  color: string
  created_at: string
}

export async function getAccounts(): Promise<AccountOut[]> {
  return api("/api/accounts")
}

export async function createAccount(input: {
  exchange: string
  name: string
  groupId?: number | null
  apiKey?: string
  secretKey?: string
  passphrase?: string
  walletAddress?: string
}): Promise<AccountOut> {
  return api("/api/accounts", { method: "POST", body: JSON.stringify(input) })
}

export async function updateAccount(
  id: number,
  patch: Partial<{
    name: string
    groupId: number | null
    apiKey: string
    secretKey: string
    passphrase: string
    walletAddress: string
    enabled: boolean
  }>,
): Promise<AccountOut> {
  return api(`/api/accounts/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
}

export async function deleteAccount(id: number): Promise<void> {
  await api(`/api/accounts/${id}`, { method: "DELETE" })
}

export async function getGroups(): Promise<GroupOut[]> {
  return api("/api/groups")
}

export async function createGroup(name: string, color?: string): Promise<GroupOut> {
  return api("/api/groups", { method: "POST", body: JSON.stringify({ name, color }) })
}

export async function deleteGroup(id: number): Promise<void> {
  await api(`/api/groups/${id}`, { method: "DELETE" })
}

export async function syncAll(): Promise<{
  results: Array<{ accountId: number; accountName: string; exchange: string; status: string; balance: number; trades: number; message?: string }>
  totalBalance: number
  errorCount: number
}> {
  return api("/api/sync", { method: "POST" })
}

export async function syncOne(id: number): Promise<{
  accountId: number
  accountName: string
  exchange: string
  status: string
  balance: number
  trades: number
  message?: string
}> {
  return api(`/api/sync/${id}`, { method: "POST" })
}

export async function getBalanceHistory(range = "30D"): Promise<{
  total: Array<{ t: string; v: number }>
  perAccount: Record<string, Array<{ t: string; v: number }>>
}> {
  return api(`/api/balance/history?range=${range}`)
}

// ─── Settings (stone-compatible) ────────────────────────────────────────────

/** Save encrypted API keys to the local backend */
export async function saveKeys(exchange: "binance" | "bybit", keys: ExchangeKeys) {
  return api("/api/v1/settings/keys", {
    method: "POST",
    body: JSON.stringify({ exchange, ...keys }),
  })
}

/** Clear stored keys for an exchange */
export async function clearKeys(exchange: "binance" | "bybit") {
  return api("/api/v1/settings/keys", {
    method: "DELETE",
    body: JSON.stringify({ exchange }),
  })
}

/** Check which exchanges have keys configured */
export async function getKeyStatus(): Promise<SettingsStatus> {
  return api("/api/v1/settings/status")
}

/** Validate the stored keys by making a live API call from the backend */
export async function testConnection(
  exchange: "binance" | "bybit"
): Promise<{ valid: boolean; error?: string }> {
  return api("/api/v1/settings/test", {
    method: "POST",
    body: JSON.stringify({ exchange }),
  })
}

/** Get the list of exchange names that have keys configured (e.g. ["Binance", "Bybit"]) */
export async function getConfiguredExchanges(): Promise<string[]> {
  const status = await getKeyStatus()
  const exchanges: string[] = []
  for (const [key, val] of Object.entries(status)) {
    if (val.configured) {
      // Capitalize first letter: "binance" -> "Binance"
      exchanges.push(key.charAt(0).toUpperCase() + key.slice(1))
    }
  }
  return exchanges.sort()
}

/** Fetch full dashboard data (MockData) from the backend */
export async function getDashboardData(): Promise<MockData> {
  return api("/api/v1/data")
}

/** Fetch CMM dashboard response (closedTrades + netWorth + lastUpdated) */
export async function getDashboardResponse(): Promise<DashboardResponse> {
  return api("/api/v1/dashboard")
}
