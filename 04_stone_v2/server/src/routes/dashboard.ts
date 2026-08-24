/**
 * Dashboard data routes — the aggregate payloads the frontend consumes.
 */
import type { FastifyInstance } from "fastify";
import type { Db } from "../db.js";
import { listAccounts, exchangeDisplayName } from "../services/accounts.js";
import { loadClosedTrades, loadPositions } from "../services/sync.js";
import { buildMockData } from "../services/analytics.js";
import type { Position } from "@stone/exchange/positions";

function toApiPosition(p: Position) {
  return {
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
  };
}

export function registerDashboardRoutes(app: FastifyInstance, db: Db): void {
  app.get("/api/v1/dashboard", async () => {
    const trades = loadClosedTrades(db);
    const netWorth = trades.reduce((s, t) => s + t.realisedPnl, 0) + 50000;
    return {
      closedTrades: trades,
      netWorth: Math.round(netWorth * 100) / 100,
      openPositions: loadPositions(db).map(toApiPosition),
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
      openPositions: loadPositions(db).map(toApiPosition),
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
}
