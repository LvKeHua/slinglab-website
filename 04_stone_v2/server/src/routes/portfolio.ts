/**
 * Portfolio positions + unified leverage routes.
 */
import type { FastifyInstance } from "fastify";
import type { Db } from "../db.js";
import { loadPositions } from "../services/sync.js";
import { mergePortfolioPositions } from "@stone/exchange/positions";

export function registerPortfolioRoutes(app: FastifyInstance, db: Db): void {
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
}
