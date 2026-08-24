/**
 * Stone API — Fastify server exposing:
 *  - the stone frontend's existing endpoints (/api/v1/dashboard, /data, …)
 *  - new account/group/balance-history endpoints
 *  - sync triggers
 */
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { Db } from "./db.js";
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccount,
  listGroups,
  createGroup,
  deleteGroup,
  exchangeDisplayName,
} from "./services/accounts.js";
import { syncAllAccounts, syncAccount, loadClosedTrades, loadBalanceHistory } from "./services/sync.js";
import { buildMockData } from "./services/analytics.js";
import { getSetting, setSetting } from "./db.js";

export interface ServerOptions {
  db: Db;
  port?: number;
  host?: string;
}

export async function buildServer(options: ServerOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  const { db } = options;

  await app.register(cors, {
    origin: true, // local self-hosted; the frontend is served from the same origin in prod
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  // ─── Health ────────────────────────────────────────────────────────────────
  app.get("/api/health", async () => ({ ok: true, version: "0.1.0" }));

  // ─── Accounts ──────────────────────────────────────────────────────────────
  app.get("/api/accounts", async () => listAccounts(db));

  app.post("/api/accounts", async (request, reply) => {
    const body = request.body as {
      exchange: string;
      name: string;
      groupId?: number | null;
      apiKey?: string;
      secretKey?: string;
      passphrase?: string;
      walletAddress?: string;
    };
    if (!body.exchange || !body.name) {
      return reply.code(400).send({ error: "exchange and name are required" });
    }
    try {
      return createAccount(db, body);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.patch("/api/accounts/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const body = request.body as Record<string, unknown>;
    try {
      return updateAccount(db, id, body);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.delete("/api/accounts/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    deleteAccount(db, id);
    return reply.code(204).send();
  });

  // ─── Groups ────────────────────────────────────────────────────────────────
  app.get("/api/groups", async () => listGroups(db));

  app.post("/api/groups", async (request, reply) => {
    const body = request.body as { name: string; color?: string };
    if (!body.name) return reply.code(400).send({ error: "name is required" });
    try {
      return createGroup(db, body.name, body.color);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.delete("/api/groups/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    deleteGroup(db, id);
    return reply.code(204).send();
  });

  // ─── Sync ──────────────────────────────────────────────────────────────────
  app.post("/api/sync", async () => syncAllAccounts(db));

  app.post("/api/sync/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!getAccount(db, id)) return reply.code(404).send({ error: "account not found" });
    return syncAccount(db, id);
  });

  // ─── Balance history ───────────────────────────────────────────────────────
  app.get("/api/balance/history", async (request) => {
    const range = ((request.query as { range?: string }).range ?? "30D") as
      | "7D"
      | "30D"
      | "90D"
      | "1Y"
      | "ALL";
    return loadBalanceHistory(db, range);
  });

  // ─── Stone-compatible endpoints ────────────────────────────────────────────
  app.get("/api/v1/dashboard", async () => {
    const trades = loadClosedTrades(db);
    const netWorth = trades.reduce((s, t) => s + t.realisedPnl, 0) + 50000;
    return {
      closedTrades: trades,
      netWorth: Math.round(netWorth * 100) / 100,
      lastUpdated: new Date().toISOString(),
    };
  });

  app.get("/api/v1/data", async () => {
    const trades = loadClosedTrades(db);
    const accounts = listAccounts(db);
    const journalRows = db
      .prepare("SELECT * FROM journal_entries ORDER BY created_at DESC")
      .all() as Array<{
      id: number;
      trade_id: string | null;
      trade: string;
      content: string;
      tags: string;
      chart_urls: string;
      confidence: number;
      emotions: string;
      created_at: string;
    }>;
    const journal = journalRows.map((r) => ({
      id: String(r.id),
      tradeId: r.trade_id ?? "",
      trade: r.trade,
      content: r.content,
      tags: JSON.parse(r.tags),
      chartUrls: JSON.parse(r.chart_urls),
      confidence: r.confidence,
      emotions: JSON.parse(r.emotions),
      createdAt: r.created_at,
    }));
    const mockData = buildMockData(trades, journal);
    return {
      ...mockData,
      accounts: accounts.map((a) => ({
        exchange: exchangeDisplayName(a.exchange),
        configured: a.hasApiKey || a.hasSecret,
        valid: a.enabled,
        assets: [],
      })),
      netWorth: trades.reduce((s, t) => s + t.realisedPnl, 0) + 50000,
      lastUpdated: new Date().toISOString(),
    };
  });

  app.get("/api/v1/calendar", async () => {
    const trades = loadClosedTrades(db);
    const map = new Map<string, { totalPnl: number; tradeCount: number; winCount: number; lossCount: number }>();
    for (const t of trades) {
      const dateKey = t.exitTime.slice(0, 10);
      const day = map.get(dateKey) ?? { totalPnl: 0, tradeCount: 0, winCount: 0, lossCount: 0 };
      day.totalPnl += t.realisedPnl;
      day.tradeCount++;
      if (t.realisedPnl > 0) day.winCount++;
      if (t.realisedPnl < 0) day.lossCount++;
      map.set(dateKey, day);
    }
    const calendar = [...map.entries()]
      .map(([date, d]) => ({ date, ...d, totalPnl: Math.round(d.totalPnl * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return { calendar, lastUpdated: new Date().toISOString() };
  });

  app.get("/api/v1/trades/by-date", async (request) => {
    const date = (request.query as { date?: string }).date;
    if (!date) return { error: "Missing date parameter" };
    const trades = loadClosedTrades(db).filter((t) => t.exitTime.startsWith(date));
    const totalPnl = trades.reduce((s, t) => s + t.realisedPnl, 0);
    return {
      date,
      trades,
      totalPnl: Math.round(totalPnl * 100) / 100,
      tradeCount: trades.length,
      winCount: trades.filter((t) => t.realisedPnl > 0).length,
      lossCount: trades.filter((t) => t.realisedPnl < 0).length,
    };
  });

  // ─── Settings (stone-compatible) ───────────────────────────────────────────
  app.get("/api/v1/settings/status", async () => {
    const accounts = listAccounts(db);
    const status: Record<string, { configured: boolean; valid: boolean }> = {};
    for (const exchange of ["binance", "bybit", "gate", "okx", "bitget", "hyperliquid", "derive", "extended", "crossex"]) {
      const account = accounts.find((a) => a.exchange === exchange);
      status[exchange] = {
        configured: account ? account.hasApiKey || account.hasSecret : false,
        valid: account ? account.enabled : false,
      };
    }
    return status;
  });

  app.post("/api/v1/settings/keys", async (request, reply) => {
    const body = request.body as { exchange: string; apiKey?: string; secretKey?: string };
    if (!body.exchange) return reply.code(400).send({ error: "exchange required" });
    const account = listAccounts(db).find((a) => a.exchange === body.exchange);
    if (!account) return reply.code(404).send({ error: `no ${body.exchange} account configured` });
    updateAccount(db, account.id, { apiKey: body.apiKey, secretKey: body.secretKey });
    return { success: true };
  });

  app.delete("/api/v1/settings/keys", async (request, reply) => {
    const body = request.body as { exchange: string };
    const account = listAccounts(db).find((a) => a.exchange === body.exchange);
    if (!account) return reply.code(404).send({ error: `no ${body.exchange} account configured` });
    updateAccount(db, account.id, { apiKey: "", secretKey: "" });
    return { success: true };
  });

  app.post("/api/v1/settings/test", async (request, reply) => {
    const body = request.body as { exchange: string };
    const account = listAccounts(db).find((a) => a.exchange === body.exchange);
    if (!account) return reply.code(400).send({ success: false, valid: false, error: "No keys configured" });
    const result = await syncAccount(db, account.id);
    return {
      success: result.status === "ok",
      valid: result.status === "ok",
      error: result.message,
    };
  });

  // ─── Journal (persisted notes) ─────────────────────────────────────────────
  app.get("/api/v1/journal", async () => {
    const rows = db
      .prepare("SELECT * FROM journal_entries ORDER BY created_at DESC")
      .all() as Array<{
      id: number;
      trade_id: string | null;
      trade: string;
      content: string;
      tags: string;
      chart_urls: string;
      confidence: number;
      emotions: string;
      created_at: string;
    }>;
    return rows.map((r) => ({
      id: String(r.id),
      tradeId: r.trade_id ?? "",
      trade: r.trade,
      content: r.content,
      tags: JSON.parse(r.tags),
      chartUrls: JSON.parse(r.chart_urls),
      confidence: r.confidence,
      emotions: JSON.parse(r.emotions),
      createdAt: r.created_at,
    }));
  });

  app.post("/api/v1/journal", async (request, reply) => {
    const body = request.body as {
      tradeId?: string;
      trade: string;
      content?: string;
      tags?: string[];
      chartUrls?: string[];
      confidence?: number;
      emotions?: string[];
    };
    if (!body.trade) return reply.code(400).send({ error: "trade is required" });
    const result = db
      .prepare(
        `INSERT INTO journal_entries (trade_id, trade, content, tags, chart_urls, confidence, emotions)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        body.tradeId ?? null,
        body.trade,
        body.content ?? "",
        JSON.stringify(body.tags ?? []),
        JSON.stringify(body.chartUrls ?? []),
        body.confidence ?? 0,
        JSON.stringify(body.emotions ?? []),
      );
    return { id: String(result.lastInsertRowid) };
  });

  // ─── Auth (single-password, stone-compatible) ─────────────────────────────
  app.post("/api/v1/login", async (request, reply) => {
    const body = request.body as { password?: string };
    const expected = getSetting(db, "site_password");
    if (!expected) return { ok: true }; // no password configured — open
    if (body.password === expected) {
      reply.header("Set-Cookie", "stone_auth=ok; Path=/; HttpOnly; Max-Age=604800");
      return { ok: true };
    }
    return reply.code(401).send({ ok: false, error: "Invalid password" });
  });

  app.post("/api/v1/logout", async (_request, reply) => {
    reply.header("Set-Cookie", "stone_auth=; Path=/; HttpOnly; Max-Age=0");
    return { ok: true };
  });

  app.post("/api/v1/settings/password", async (request, reply) => {
    const body = request.body as { password?: string };
    if (!body.password || body.password.length < 6) {
      return reply.code(400).send({ error: "password must be at least 6 characters" });
    }
    setSetting(db, "site_password", body.password);
    return { success: true };
  });

  return app;
}
