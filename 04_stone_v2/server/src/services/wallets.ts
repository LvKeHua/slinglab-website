/**
 * On-chain wallet clients — ported from crypto-portfolio-tracker-oss (MIT).
 * DeBank Cloud API for EVM wallets (tokens + DeFi positions), CoinStats for
 * Solana/Sui/Cosmos. Provider keys live in the settings table.
 */
import type { Db } from "../db.js";
import { getSetting } from "../db.js";

const FETCH_TIMEOUT_MS = 20_000;

export interface WalletHolding {
  symbol: string;
  name: string;
  chain: string;
  amount: number;
  price: number;
  usdValue: number;
  kind: "token" | "defi";
  protocol?: string;
}

export interface WalletResult {
  totalUsd: number;
  holdings: WalletHolding[];
  error?: string;
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

function toNumber(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

// ─── DeBank (EVM) ────────────────────────────────────────────────────────────

export async function fetchDebankWallet(db: Db, address: string): Promise<WalletResult> {
  const accessKey = getSetting(db, "debank_access_key");
  if (!accessKey) return { totalUsd: 0, holdings: [], error: "DeBank AccessKey not configured (Settings → Data Providers)" };
  try {
    const [total, tokens, apps] = await Promise.all([
      fetchJson(`https://pro-openapi.debank.com/v1/user/total_balance?id=${address}`, { AccessKey: accessKey }) as Promise<{ total_usd?: number }>,
      fetchJson(`https://pro-openapi.debank.com/v1/user/all_token_list?id=${address}&is_all=true`, { AccessKey: accessKey }) as Promise<Array<Record<string, unknown>>>,
      fetchJson(`https://pro-openapi.debank.com/v1/user/complex_app_list?id=${address}`, { AccessKey: accessKey }) as Promise<Array<Record<string, unknown>>>,
    ]);

    const holdings: WalletHolding[] = [];
    for (const t of tokens) {
      const amount = toNumber(t.amount);
      const price = toNumber(t.price);
      if (amount <= 0) continue;
      holdings.push({
        symbol: String(t.symbol ?? "").toUpperCase(),
        name: String(t.name ?? t.symbol ?? ""),
        chain: String(t.chain ?? "evm"),
        amount,
        price,
        usdValue: amount * price,
        kind: "token",
      });
    }

    // DeFi positions: lending / LP / staking / perps per protocol
    for (const app of apps) {
      const protocol = String(app.name ?? app.id ?? "DeFi");
      const items = Array.isArray(app.portfolio_item_list) ? (app.portfolio_item_list as Array<Record<string, unknown>>) : [];
      for (const item of items) {
        const stats = (item.stats ?? {}) as Record<string, unknown>;
        const netUsd = toNumber(stats.net_usd ?? stats.asset_usd_value);
        if (netUsd <= 0) continue;
        const detail = (item.detail ?? {}) as Record<string, unknown>;
        const supplyList = Array.isArray(detail.supply_token_list) ? (detail.supply_token_list as Array<Record<string, unknown>>) : [];
        const symbol = supplyList.length > 0
          ? String(supplyList[0].symbol ?? "").toUpperCase()
          : String(item.name ?? protocol).toUpperCase();
        holdings.push({
          symbol,
          name: String(item.name ?? protocol),
          chain: String(app.chain ?? "evm"),
          amount: 0,
          price: 0,
          usdValue: netUsd,
          kind: "defi",
          protocol,
        });
      }
    }

    holdings.sort((a, b) => b.usdValue - a.usdValue);
    return { totalUsd: Math.round(toNumber(total.total_usd) * 100) / 100, holdings };
  } catch (err) {
    return { totalUsd: 0, holdings: [], error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── CoinStats (Solana / Sui / Cosmos) ───────────────────────────────────────

const COINSTATS_CONNECTIONS: Record<string, string> = {
  solana: "solana",
  sui: "sui-wallet",
  cosmos: "cosmos",
};

export async function fetchCoinstatsWallet(db: Db, chain: string, address: string): Promise<WalletResult> {
  const apiKey = getSetting(db, "coinstats_api_key");
  if (!apiKey) return { totalUsd: 0, holdings: [], error: "CoinStats API key not configured (Settings → Data Providers)" };
  const connectionId = COINSTATS_CONNECTIONS[chain];
  if (!connectionId) return { totalUsd: 0, holdings: [], error: `unsupported chain: ${chain}` };
  try {
    const data = await fetchJson(
      `https://openapiv1.coinstats.app/wallet/balance?address=${encodeURIComponent(address)}&connectionId=${connectionId}`,
      { "X-API-KEY": apiKey },
    ) as Array<Record<string, unknown>>;

    const holdings: WalletHolding[] = [];
    let total = 0;
    for (const item of data) {
      const amount = toNumber(item.amount);
      const price = toNumber(item.price);
      const usdValue = amount * price;
      if (usdValue <= 0) continue;
      total += usdValue;
      holdings.push({
        symbol: String(item.symbol ?? "").toUpperCase(),
        name: String(item.name ?? item.symbol ?? ""),
        chain,
        amount,
        price,
        usdValue,
        kind: "token",
      });
    }
    holdings.sort((a, b) => b.usdValue - a.usdValue);
    return { totalUsd: Math.round(total * 100) / 100, holdings };
  } catch (err) {
    return { totalUsd: 0, holdings: [], error: err instanceof Error ? err.message : String(err) };
  }
}
