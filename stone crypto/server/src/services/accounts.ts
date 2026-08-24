/**
 * Account + group management over the SQLite store.
 */
import type { Db } from "../db.js";
import { encryptSecret, decryptSecret } from "../crypto.js";

export interface AccountRow {
  id: number;
  exchange: string;
  name: string;
  group_id: number | null;
  api_key_enc: string | null;
  secret_key_enc: string | null;
  passphrase_enc: string | null;
  wallet_address: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface AccountOut {
  id: number;
  exchange: string;
  name: string;
  group: string | null;
  groupId: number | null;
  hasApiKey: boolean;
  hasSecret: boolean;
  hasPassphrase: boolean;
  walletAddress: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountInput {
  exchange: string;
  name: string;
  groupId?: number | null;
  apiKey?: string;
  secretKey?: string;
  passphrase?: string;
  walletAddress?: string;
  enabled?: boolean;
}

export interface GroupRow {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

const EXCHANGE_NAMES: Record<string, string> = {
  binance: "Binance",
  bybit: "Bybit",
  gate: "Gate",
  okx: "OKX",
  bitget: "Bitget",
  hyperliquid: "Hyperliquid",
  derive: "Derive",
  extended: "Extended",
  crossex: "CrossEx",
};

export function exchangeDisplayName(exchange: string): string {
  return EXCHANGE_NAMES[exchange] ?? exchange;
}

export function listGroups(db: Db): GroupRow[] {
  return db.prepare("SELECT * FROM groups ORDER BY name").all() as GroupRow[];
}

export function createGroup(db: Db, name: string, color = "#8a8376"): GroupRow {
  db.prepare("INSERT INTO groups (name, color) VALUES (?, ?)").run(name, color);
  return db.prepare("SELECT * FROM groups WHERE name = ?").get(name) as GroupRow;
}

export function deleteGroup(db: Db, id: number): void {
  db.prepare("UPDATE accounts SET group_id = NULL WHERE group_id = ?").run(id);
  db.prepare("DELETE FROM groups WHERE id = ?").run(id);
}

export function listAccounts(db: Db): AccountOut[] {
  const rows = db
    .prepare(
      `SELECT a.*, g.name AS group_name FROM accounts a
       LEFT JOIN groups g ON g.id = a.group_id
       ORDER BY a.exchange, a.name`,
    )
    .all() as Array<AccountRow & { group_name: string | null }>;
  return rows.map(toOut);
}

function toOut(row: AccountRow & { group_name?: string | null }): AccountOut {
  return {
    id: row.id,
    exchange: row.exchange,
    name: row.name,
    group: row.group_name ?? null,
    groupId: row.group_id,
    hasApiKey: row.api_key_enc != null,
    hasSecret: row.secret_key_enc != null,
    hasPassphrase: row.passphrase_enc != null,
    walletAddress: row.wallet_address,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAccount(db: Db, id: number): (AccountRow & { group_name: string | null }) | null {
  return (
    (db
      .prepare(
        `SELECT a.*, g.name AS group_name FROM accounts a
         LEFT JOIN groups g ON g.id = a.group_id
         WHERE a.id = ?`,
      )
      .get(id) as (AccountRow & { group_name: string | null }) | undefined) ?? null
  );
}

export function createAccount(db: Db, input: AccountInput): AccountOut {
  const existing = db
    .prepare("SELECT id FROM accounts WHERE exchange = ? AND name = ?")
    .get(input.exchange, input.name);
  if (existing) throw new Error(`Account "${input.name}" already exists on ${input.exchange}`);

  db.prepare(
    `INSERT INTO accounts (exchange, name, group_id, api_key_enc, secret_key_enc, passphrase_enc, wallet_address, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.exchange,
    input.name,
    input.groupId ?? null,
    input.apiKey ? encryptSecret(input.apiKey) : null,
    input.secretKey ? encryptSecret(input.secretKey) : null,
    input.passphrase ? encryptSecret(input.passphrase) : null,
    input.walletAddress ?? null,
    input.enabled === false ? 0 : 1,
  );
  const inserted = db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number };
  const row = getAccount(db, inserted.id);
  return toOut(row!);
}

export function updateAccount(db: Db, id: number, patch: Partial<AccountInput>): AccountOut {
  const row = getAccount(db, id);
  if (!row) throw new Error("Account not found");

  const fields: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(patch.name);
  }
  if (patch.groupId !== undefined) {
    fields.push("group_id = ?");
    values.push(patch.groupId);
  }
  if (patch.apiKey !== undefined) {
    fields.push("api_key_enc = ?");
    values.push(patch.apiKey ? encryptSecret(patch.apiKey) : null);
  }
  if (patch.secretKey !== undefined) {
    fields.push("secret_key_enc = ?");
    values.push(patch.secretKey ? encryptSecret(patch.secretKey) : null);
  }
  if (patch.passphrase !== undefined) {
    fields.push("passphrase_enc = ?");
    values.push(patch.passphrase ? encryptSecret(patch.passphrase) : null);
  }
  if (patch.walletAddress !== undefined) {
    fields.push("wallet_address = ?");
    values.push(patch.walletAddress);
  }
  if (patch.enabled !== undefined) {
    fields.push("enabled = ?");
    values.push(patch.enabled ? 1 : 0);
  }
  if (fields.length === 0) return toOut(row);

  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE accounts SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return toOut(getAccount(db, id)!);
}

export function deleteAccount(db: Db, id: number): void {
  db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
}

export function getDecryptedCreds(db: Db, id: number): {
  apiKey: string | null;
  secretKey: string | null;
  passphrase: string | null;
  walletAddress: string | null;
} {
  const row = db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow | undefined;
  if (!row) return { apiKey: null, secretKey: null, passphrase: null, walletAddress: null };
  return {
    apiKey: row.api_key_enc ? decryptSecret(row.api_key_enc) : null,
    secretKey: row.secret_key_enc ? decryptSecret(row.secret_key_enc) : null,
    passphrase: row.passphrase_enc ? decryptSecret(row.passphrase_enc) : null,
    walletAddress: row.wallet_address,
  };
}
