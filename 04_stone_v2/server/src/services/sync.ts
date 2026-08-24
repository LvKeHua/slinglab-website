/**
 * Sync service — pulls balances, open positions, and trade history for every
 * enabled account, persists snapshots (balance history), positions, and
 * closed trades to SQLite.
 */
import type { Db } from "../db.js";
import { getDecryptedCreds, listAccounts, getAccount } from "./accounts.js";
import { fetchExchangeBalances, fetchCrossExBalances, type ExchangeKind } from "@stone/exchange/balances";
import { fetchBinanceTrades, fetchCrossExTrades } from "@stone/exchange/trades";
import { getPositionFetcher, type Position } from "@stone/exchange/positions";
import type { ClosedTrade } from "@stone/exchange/pairing";

export interface SyncResult {
  accountId: number;
  accountName: string;
  exchange: string;
  status: "ok" | "error";
  balance: number;
  trades: number;
  positions: number;
  message?: string;
}

export interface SyncSummary {
  results: SyncResult[];
  totalBalance: number;
  errorCount: number;
}

export async function syncAccount(db: Db, accountId: number): Promise<SyncResult> {
  const account = getAccount(db, accountId);
  if (!account) throw new Error("Account not found");
  if (account.enabled !== 1) {
    return {
      accountId,
      accountName: account.name,
      exchange: account.exchange,
      status: "error",
      balance: 0,
      trades: 0,
      positions: 0,
      message: "account disabled",
    };
  }

  const creds = getDecryptedCreds(db, accountId);
  const exchange = account.exchange as ExchangeKind | "crossex";

  try {
    let balance = 0;
    let holdings: Array<{ symbol: string; free: number; locked: number; valueUsdt: number; priceUsdt: number }> = [];
    let trades: ClosedTrade[] = [];
    let positions: Position[] = [];

    if (exchange === "crossex") {
      // CrossEx: one Gate key covers 7 venues — balances + history trades
      if (!creds.apiKey || !creds.secretKey) throw new Error("CrossEx API key required");
      const bal = await fetchCrossExBalances({ apiKey: creds.apiKey, secretKey: creds.secretKey });
      balance = bal.totalUsd;
      holdings = bal.assets;
      trades = await fetchCrossExTrades({ apiKey: creds.apiKey, apiSecret: creds.secretKey }, account.name);
    } else if (exchange === "binance") {
      if (!creds.apiKey || !creds.secretKey) throw new Error("Binance API key required");
      const bal = await fetchExchangeBalances("binance", {
        apiKey: creds.apiKey,
        secretKey: creds.secretKey,
      });
      if (!bal.valid) throw new Error(bal.error ?? "balance fetch failed");
      balance = bal.totalUsd;
      holdings = bal.assets;
      trades = await fetchBinanceTrades(creds.apiKey, creds.secretKey, account.name);
    } else {
      const bal = await fetchExchangeBalances(exchange, {
        apiKey: creds.apiKey ?? "",
        secretKey: creds.secretKey ?? "",
        passphrase: creds.passphrase ?? undefined,
        walletAddress: creds.walletAddress ?? undefined,
      });
      if (!bal.valid) throw new Error(bal.error ?? "balance fetch failed");
      balance = bal.totalUsd;
      holdings = bal.assets;
    }

    // Open positions — best-effort, never fails the whole sync.
    const positionFetcher = getPositionFetcher(exchange);
    if (positionFetcher) {
      const posResult = await positionFetcher({
        apiKey: creds.apiKey ?? "",
        secretKey: creds.secretKey ?? "",
        passphrase: creds.passphrase ?? undefined,
        walletAddress: creds.walletAddress ?? undefined,
      });
      if (!posResult.error) positions = posResult.positions;
    }

    persistSnapshot(db, accountId, balance, holdings);
    if (trades.length > 0) persistTrades(db, trades);
    persistPositions(db, exchange, positions);

    return {
      accountId,
      accountName: account.name,
      exchange: account.exchange,
      status: "ok",
      balance,
      trades: trades.length,
      positions: positions.length,
    };
  } catch (err) {
    return {
      accountId,
      accountName: account.name,
      exchange: account.exchange,
      status: "error",
      balance: 0,
      trades: 0,
      positions: 0,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── CrossEx balance fetch lives in balances.ts ────────────────────────────

export async function syncAllAccounts(db: Db): Promise<SyncSummary> {
  const accounts = listAccounts(db).filter((a) => a.enabled);
  const results: SyncResult[] = [];
  let totalBalance = 0;
  let errorCount = 0;

  for (const account of accounts) {
    const result = await syncAccount(db, account.id);
    results.push(result);
    if (result.status === "ok") {
      totalBalance += result.balance;
    } else {
      errorCount++;
    }
  }

  // Persist the aggregate total snapshot for the balance-history chart
  if (results.length > 0) {
    db.prepare("INSERT INTO total_snapshots (v) VALUES (?)").run(totalBalance);
  }

  return { results, totalBalance, errorCount };
}

function persistSnapshot(
  db: Db,
  accountId: number,
  balance: number,
  holdings: Array<{ symbol: string; free: number; locked: number; valueUsdt: number; priceUsdt: number }>,
): void {
  db.prepare(
    "INSERT INTO account_snapshots (account_id, bal, holdings) VALUES (?, ?, ?)",
  ).run(accountId, Math.round(balance * 100) / 100, JSON.stringify(holdings));
}

/**
 * Positions table holds the *latest* snapshot per (exchange, symbol, side):
 * sync wipes the exchange's rows and re-inserts current state.
 */
function persistPositions(db: Db, exchange: string, positions: Position[]): void {
  const del = db.prepare("DELETE FROM positions WHERE exchange = ?");
  const insert = db.prepare(
    `INSERT INTO positions
     (exchange, symbol, side, size, entry_price, mark_price, notional_usd,
      pnl, roi, leverage, margin, liquidation_price, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction((rows: Position[]) => {
    del.run(exchange);
    for (const p of rows) {
      insert.run(
        p.exchange,
        p.symbol,
        p.side,
        p.size,
        p.entryPrice,
        p.markPrice,
        p.notionalUsd,
        p.pnl,
        p.roi,
        p.leverage,
        p.margin,
        p.liquidationPrice,
        p.updatedAt,
      );
    }
  });
  tx(positions);
}

/** Load the persisted latest position snapshot across all exchanges. */
export function loadPositions(db: Db): Position[] {
  const rows = db
    .prepare(
      `SELECT exchange, symbol, side, size, entry_price AS entryPrice,
              mark_price AS markPrice, notional_usd AS notionalUsd,
              pnl, roi, leverage, margin, liquidation_price AS liquidationPrice,
              updated_at AS updatedAt
       FROM positions ORDER BY notional_usd DESC`,
    )
    .all() as Position[];
  return rows.map((r) => ({ ...r, liquidationPrice: r.liquidationPrice ?? null }));
}

function persistTrades(db: Db, trades: ClosedTrade[]): void {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO closed_trades
     (symbol, dir, size, entry, exit, hold_time, realised_pnl, r_multiple,
      exchange, account, entry_time, exit_time, sequence, is_win, is_breakeven)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction((rows: ClosedTrade[]) => {
    for (const t of rows) {
      insert.run(
        t.symbol,
        t.dir,
        t.size,
        t.entry,
        t.exit,
        t.holdTime,
        t.realisedPnl,
        t.rMultiple,
        t.exchange,
        t.account,
        t.entryTime,
        t.exitTime,
        t.sequence,
        t.isWin ? 1 : 0,
        t.isBreakeven ? 1 : 0,
      );
    }
  });
  tx(trades);
}

export function loadClosedTrades(db: Db): ClosedTrade[] {
  const rows = db
    .prepare(
      `SELECT id, symbol, dir, size, entry, exit, hold_time AS holdTime,
              realised_pnl AS realisedPnl, r_multiple AS rMultiple, exchange,
              account, entry_time AS entryTime, exit_time AS exitTime,
              sequence, is_win AS isWin, is_breakeven AS isBreakeven
       FROM closed_trades ORDER BY exit_time DESC`,
    )
    .all() as Array<{
    id: number;
    symbol: string;
    dir: "Long" | "Short";
    size: number;
    entry: number;
    exit: number;
    holdTime: string;
    realisedPnl: number;
    rMultiple: number;
    exchange: string;
    account: string;
    entryTime: string;
    exitTime: string;
    sequence: number;
    isWin: number;
    isBreakeven: number;
  }>;

  return rows.map((r) => ({
    ...r,
    isWin: r.isWin === 1,
    isBreakeven: r.isBreakeven === 1,
  }));
}

export function loadBalanceHistory(
  db: Db,
  range: "7D" | "30D" | "90D" | "1Y" | "ALL" = "30D",
): {
  total: Array<{ t: string; v: number }>;
  perAccount: Record<string, Array<{ t: string; v: number }>>;
} {
  const days = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365, ALL: 3650 }[range];
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const totalRows = db
    .prepare("SELECT created_at AS t, v FROM total_snapshots WHERE created_at >= ? ORDER BY created_at")
    .all(cutoff) as Array<{ t: string; v: number }>;

  const accountRows = db
    .prepare(
      `SELECT s.created_at AS t, s.bal AS v, a.name AS account
       FROM account_snapshots s JOIN accounts a ON a.id = s.account_id
       WHERE s.created_at >= ? ORDER BY s.created_at`,
    )
    .all(cutoff) as Array<{ t: string; v: number; account: string }>;

  const perAccount: Record<string, Array<{ t: string; v: number }>> = {};
  for (const row of accountRows) {
    (perAccount[row.account] ??= []).push({ t: row.t, v: row.v });
  }

  return { total: totalRows, perAccount };
}
