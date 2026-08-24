/**
 * Stone v2 API — Fastify composition root.
 * Route modules live in ./routes; services in ./services.
 */
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { Db } from "./db.js";
import { registerAccountRoutes } from "./routes/accounts.js";
import { registerSyncRoutes } from "./routes/sync.js";
import { registerPortfolioRoutes } from "./routes/portfolio.js";
import { registerMarketRoutes } from "./routes/market.js";
import { registerTradeRoutes } from "./routes/trades.js";
import { registerWalletRoutes } from "./routes/wallets.js";
import { registerJournalRoutes } from "./routes/journal.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";

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

  app.get("/api/health", async () => ({ ok: true, version: "2.0.0" }));

  registerAccountRoutes(app, db);
  registerSyncRoutes(app, db);
  registerPortfolioRoutes(app, db);
  registerMarketRoutes(app);
  registerTradeRoutes(app, db);
  registerWalletRoutes(app, db);
  registerJournalRoutes(app, db);
  registerSettingsRoutes(app, db);
  registerDashboardRoutes(app, db);

  return app;
}
