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
import { syncAllAccounts, syncAccount, loadClosedTrades, loadBalanceHistory, loadPositions } from "./services/sync.js";
import { mergePortfolioPositions } from "./services/positions.js";
import { fetchMarketRadar } from "./services/market.js";
import { saveUpload, readUpload } from "./services/uploads.js";
import { fetchDebankWallet, fetchCoinstatsWallet } from "./services/wallets.js";
import { fetchFundingHeatmap } from "./services/market.js";
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

  // ─── Positions & portfolio leverage ────────────────────────────────────────
  app.get("/api/positions", async () => {
    const positions = loadPositions(db);
    const grouped = new Map<string, typeof positions>();
    for (const p of positions) {
      let list = grouped.get(p.exchange);
      if (!list) { list = []; grouped.set(p.exchange, list); }
      list.push(p);
    }
    const results = [...grouped.entries()].map(([exchange, list]) => ({
      exchange,
      result: {
        positions: list,
        notionalTotal: Math.round(list.reduce((s, p) => s + p.notionalUsd, 0) * 100) / 100,
        marginTotal: Math.round(list.reduce((s, p) => s + p.margin, 0) * 100) / 100,
        pnlTotal: Math.round(list.reduce((s, p) => s + p.pnl, 0) * 100) / 100,
        leverage: null as number | null,
      },
    }));
    return mergePortfolioPositions(results);
  });

  // ─── Market radar (public Binance data, server-side fetch) ─────────────────
  app.get("/api/market-radar", async (_request, reply) => {
    try {
      return await fetchMarketRadar();
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get("/api/funding-heatmap", async (_request, reply) => {
    try {
      return await fetchFundingHeatmap(24, 20);
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ─── Manual trade entry (CMM Add Transaction) ──────────────────────────────
  app.post("/api/trades/manual", async (request, reply) => {
    const body = request.body as {
      symbol?: string;
      dir?: string;
      size?: number;
      entry?: number;
      exit?: number;
      entryTime?: string;
      exitTime?: string;
      fees?: number;
    };
    if (!body.symbol || !body.dir || !body.entry || !body.exit) {
      return reply.code(400).send({ error: "symbol, dir, entry, exit are required" });
    }
    const dir = body.dir === "Short" ? "Short" : "Long";
    const size = Math.abs(Number(body.size) || 0);
    const entry = Number(body.entry);
    const exit = Number(body.exit);
    const fees = Math.abs(Number(body.fees) || 0);
    const entryTime = body.entryTime ? new Date(body.entryTime).toISOString() : new Date().toISOString();
    const exitTime = body.exitTime ? new Date(body.exitTime).toISOString() : new Date().toISOString();
    const priceDiff = dir === "Long" ? exit - entry : entry - exit;
    const realisedPnl = Math.round((priceDiff * size - fees) * 100) / 100;
    const risk = Math.abs(entry - exit) * size;
    const rMultiple = risk > 0 ? Math.round((realisedPnl / risk) * 100) / 100 : 0;
    const holdMs = new Date(exitTime).getTime() - new Date(entryTime).getTime();
    const holdTime = holdMs < 60_000 ? `${Math.max(1, Math.round(holdMs / 1000))}s`
      : holdMs < 3_600_000 ? `${Math.round(holdMs / 60_000)}m`
      : holdMs < 86_400_000 ? `${(holdMs / 3_600_000).toFixed(1)}h`
      : `${(holdMs / 86_400_000).toFixed(1)}d`;
    const result = db
      .prepare(
        `INSERT INTO closed_trades
         (symbol, dir, size, entry, exit, hold_time, realised_pnl, r_multiple,
          exchange, account, entry_time, exit_time, sequence, is_win, is_breakeven)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Manual', 'Manual', ?, ?, 0, ?, ?)`,
      )
      .run(
        body.symbol.toUpperCase(),
        dir,
        size,
        entry,
        exit,
        holdTime,
        realisedPnl,
        rMultiple,
        entryTime,
        exitTime,
        realisedPnl > 0 ? 1 : 0,
        realisedPnl === 0 ? 1 : 0,
      );
    return { id: String(result.lastInsertRowid), realisedPnl, rMultiple };
  });

  // ─── Chart screenshot uploads (Mazino-style) ──────────────────────────────
  app.post("/api/uploads", async (request, reply) => {
    const body = request.body as { dataUrl?: string };
    if (!body.dataUrl) return reply.code(400).send({ error: "dataUrl is required" });
    try {
      return saveUpload(body.dataUrl);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get("/api/uploads/:file", async (request, reply) => {
    const file = (request.params as { file: string }).file;
    const upload = readUpload(file);
    if (!upload) return reply.code(404).send({ error: "not found" });
    reply.header("Content-Type", upload.mime);
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(upload.data);
  });

  // ─── On-chain wallets (DeBank EVM / CoinStats Solana-Sui-Cosmos) ───────────
  app.get("/api/wallets", async () => {
    const rows = db.prepare("SELECT * FROM wallets ORDER BY created_at").all() as Array<{
      id: number; chain: string; name: string; address: string; enabled: number; created_at: string;
    }>;
    return rows.map((r) => ({
      id: String(r.id),
      chain: r.chain,
      name: r.name,
      address: r.address,
      enabled: r.enabled === 1,
      createdAt: r.created_at,
    }));
  });

  app.post("/api/wallets", async (request, reply) => {
    const body = request.body as { chain?: string; name?: string; address?: string };
    if (!body.chain || !body.address) return reply.code(400).send({ error: "chain and address are required" });
    const result = db
      .prepare("INSERT INTO wallets (chain, name, address) VALUES (?, ?, ?)")
      .run(body.chain, body.name ?? body.address, body.address);
    return { id: String(result.lastInsertRowid) };
  });

  app.delete("/api/wallets/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    db.prepare("DELETE FROM wallets WHERE id = ?").run(id);
    return reply.code(204).send();
  });

  app.post("/api/wallets/:id/sync", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const row = db.prepare("SELECT * FROM wallets WHERE id = ?").get(id) as
      | { id: number; chain: string; address: string }
      | undefined;
    if (!row) return reply.code(404).send({ error: "wallet not found" });
    const result = row.chain === "evm"
      ? await fetchDebankWallet(db, row.address)
      : await fetchCoinstatsWallet(db, row.chain, row.address);
    if (result.error) return reply.code(502).send({ error: result.error });
    db.prepare("INSERT INTO wallet_snapshots (wallet_id, bal, holdings) VALUES (?, ?, ?)").run(
      id,
      result.totalUsd,
      JSON.stringify(result.holdings),
    );
    return { totalUsd: result.totalUsd, holdings: result.holdings };
  });

  app.get("/api/wallets/:id/history", async (request) => {
    const id = Number((request.params as { id: string }).id);
    const rows = db
      .prepare("SELECT created_at AS t, bal AS v FROM wallet_snapshots WHERE wallet_id = ? ORDER BY created_at")
      .all(id) as Array<{ t: string; v: number }>;
    return rows;
  });

  // ─── Data provider keys (DeBank / CoinStats) ───────────────────────────────
  app.get("/api/v1/settings/providers", async () => ({
    debankAccessKey: getSetting(db, "debank_access_key") ?? "",
    coinstatsApiKey: getSetting(db, "coinstats_api_key") ?? "",
  }));

  app.post("/api/v1/settings/providers", async (request, reply) => {
    const body = request.body as { debankAccessKey?: string; coinstatsApiKey?: string };
    if (body.debankAccessKey !== undefined) setSetting(db, "debank_access_key", body.debankAccessKey);
    if (body.coinstatsApiKey !== undefined) setSetting(db, "coinstats_api_key", body.coinstatsApiKey);
    return { success: true };
  });

  // ─── Stone-compatible endpoints ────────────────────────────────────────────
  app.get("/api/v1/dashboard", async () => {
    const trades = loadClosedTrades(db);
    const netWorth = trades.reduce((s, t) => s + t.realisedPnl, 0) + 50000;
    const openPositions = loadPositions(db).map((p) => ({
      symbol: p.symbol,
      side: p.side,
      size: p.size,
      entryPrice: p.entryPrice,
      markPrice: p.markPrice,
      unrealizedPnl: p.pnl,
      leverage: p.leverage,
      liquidationPrice: p.liquidationPrice ?? 0,
      exchange: p.exchange,
      notionalUsd: p.notionalUsd,
      roi: p.roi,
      margin: p.margin,
    }));
    return {
      closedTrades: trades,
      netWorth: Math.round(netWorth * 100) / 100,
      openPositions,
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
    const openPositions = loadPositions(db).map((p) => ({
      symbol: p.symbol,
      side: p.side,
      size: p.size,
      entryPrice: p.entryPrice,
      markPrice: p.markPrice,
      unrealizedPnl: p.pnl,
      leverage: p.leverage,
      liquidationPrice: p.liquidationPrice ?? 0,
      exchange: p.exchange,
      notionalUsd: p.notionalUsd,
      roi: p.roi,
      margin: p.margin,
    }));
    return {
      ...mockData,
      openPositions,
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

  // ─── Scorecards (Mazino-style trade grades) ───────────────────────────────
  app.get("/api/scorecards", async () => {
    const rows = db.prepare("SELECT * FROM scorecards ORDER BY created_at DESC").all() as Array<{
      id: number; symbol: string; direction: string; entry: number | null; exit: number | null;
      r_multiple: number; pnl: number; grade: number | null; checks: string; notes: string; created_at: string;
    }>;
    return rows.map((r) => ({
      id: String(r.id),
      symbol: r.symbol,
      direction: r.direction,
      entry: r.entry,
      exit: r.exit,
      rMultiple: r.r_multiple,
      pnl: r.pnl,
      grade: r.grade,
      checks: JSON.parse(r.checks),
      notes: r.notes,
      createdAt: r.created_at,
    }));
  });

  app.post("/api/scorecards", async (request, reply) => {
    const body = request.body as {
      symbol: string; direction?: string; entry?: number | null; exit?: number | null;
      rMultiple?: number; pnl?: number; grade?: number | null; checks?: string[]; notes?: string;
    };
    if (!body.symbol) return reply.code(400).send({ error: "symbol is required" });
    const result = db
      .prepare(
        `INSERT INTO scorecards (symbol, direction, entry, exit, r_multiple, pnl, grade, checks, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        body.symbol,
        body.direction ?? "Long",
        body.entry ?? null,
        body.exit ?? null,
        body.rMultiple ?? 0,
        body.pnl ?? 0,
        body.grade ?? null,
        JSON.stringify(body.checks ?? []),
        body.notes ?? "",
      );
    return { id: String(result.lastInsertRowid) };
  });

  app.delete("/api/scorecards/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    db.prepare("DELETE FROM scorecards WHERE id = ?").run(id);
    return reply.code(204).send();
  });

  // ─── Strategies (Mazino-style playbook cards) ─────────────────────────────
  app.get("/api/strategies", async () => {
    const rows = db.prepare("SELECT * FROM strategies ORDER BY created_at DESC").all() as Array<{
      id: number; name: string; description: string; rules: string; created_at: string;
    }>;
    return rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      description: r.description,
      rules: JSON.parse(r.rules),
      createdAt: r.created_at,
    }));
  });

  app.post("/api/strategies", async (request, reply) => {
    const body = request.body as { name: string; description?: string; rules?: string[] };
    if (!body.name) return reply.code(400).send({ error: "name is required" });
    const result = db
      .prepare("INSERT INTO strategies (name, description, rules) VALUES (?, ?, ?)")
      .run(body.name, body.description ?? "", JSON.stringify(body.rules ?? []));
    return { id: String(result.lastInsertRowid) };
  });

  app.delete("/api/strategies/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    db.prepare("DELETE FROM strategies WHERE id = ?").run(id);
    return reply.code(204).send();
  });

  // ─── Sticky notes (Mazino floating memos) ─────────────────────────────────
  app.get("/api/notes", async () => {
    const rows = db.prepare("SELECT * FROM sticky_notes ORDER BY created_at").all() as Array<{
      id: number; content: string; x: number; y: number; w: number; h: number; created_at: string;
    }>;
    return rows.map((r) => ({ id: String(r.id), content: r.content, x: r.x, y: r.y, w: r.w, h: r.h, createdAt: r.created_at }));
  });

  app.post("/api/notes", async (request, reply) => {
    const body = request.body as { content?: string; x?: number; y?: number; w?: number; h?: number };
    const result = db
      .prepare("INSERT INTO sticky_notes (content, x, y, w, h) VALUES (?, ?, ?, ?, ?)")
      .run(body.content ?? "", body.x ?? 20, body.y ?? 20, body.w ?? 260, body.h ?? 180);
    return { id: String(result.lastInsertRowid) };
  });

  app.patch("/api/notes/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const body = request.body as { content?: string; x?: number; y?: number; w?: number; h?: number };
    const row = db.prepare("SELECT * FROM sticky_notes WHERE id = ?").get(id) as
      | { content: string; x: number; y: number; w: number; h: number }
      | undefined;
    if (!row) return reply.code(404).send({ error: "note not found" });
    db.prepare("UPDATE sticky_notes SET content = ?, x = ?, y = ?, w = ?, h = ? WHERE id = ?").run(
      body.content ?? row.content,
      body.x ?? row.x,
      body.y ?? row.y,
      body.w ?? row.w,
      body.h ?? row.h,
      id,
    );
    return { id: String(id) };
  });

  app.delete("/api/notes/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    db.prepare("DELETE FROM sticky_notes WHERE id = ?").run(id);
    return reply.code(204).send();
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
