/**
 * SQLite persistence layer for the Stone self-hosted backend.
 * Schema is created on startup; no migration framework (matches the
 * portfolio-tracker convention this backend absorbs).
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.STONE_DATA_DIR ?? join(__dirname, "..", "..", "data");
export const DB_PATH = process.env.STONE_DB_PATH ?? join(DATA_DIR, "stone.db");

export type Db = Database.Database;

export function openDatabase(): Db {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#8a8376',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exchange TEXT NOT NULL,            -- binance | bybit | gate | okx | bitget | hyperliquid | derive | extended | crossex
      name TEXT NOT NULL,
      group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
      api_key_enc TEXT,
      secret_key_enc TEXT,
      passphrase_enc TEXT,
      wallet_address TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(exchange, name)
    );

    CREATE TABLE IF NOT EXISTS account_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      bal REAL NOT NULL DEFAULT 0,
      holdings TEXT NOT NULL DEFAULT '[]',   -- JSON array of {symbol, free, locked, valueUsdt, priceUsdt}
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_account_time
      ON account_snapshots(account_id, created_at);

    CREATE TABLE IF NOT EXISTS total_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      v REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_total_snapshots_time ON total_snapshots(created_at);

    CREATE TABLE IF NOT EXISTS closed_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      dir TEXT NOT NULL,                 -- Long | Short
      size REAL NOT NULL,
      entry REAL NOT NULL,
      exit REAL NOT NULL,
      hold_time TEXT NOT NULL,
      realised_pnl REAL NOT NULL,
      r_multiple REAL NOT NULL,
      exchange TEXT NOT NULL,
      account TEXT NOT NULL,
      entry_time TEXT NOT NULL,
      exit_time TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      is_win INTEGER NOT NULL,
      is_breakeven INTEGER NOT NULL,
      raw_fills TEXT NOT NULL DEFAULT '[]',
      UNIQUE(exchange, account, symbol, entry_time, exit_time)
    );
    CREATE INDEX IF NOT EXISTS idx_trades_exit_time ON closed_trades(exit_time);
    CREATE INDEX IF NOT EXISTS idx_trades_exchange ON closed_trades(exchange);

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id TEXT,
      trade TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      chart_urls TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0,
      emotions TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ─── Settings helpers ────────────────────────────────────────────────────────

export function getSetting(db: Db, key: string): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(db: Db, key: string, value: string): void {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}
