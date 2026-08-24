/**
 * Sync + balance history routes.
 */
import type { FastifyInstance } from "fastify";
import type { Db } from "../db.js";
import { getAccount } from "../services/accounts.js";
import { syncAllAccounts, syncAccount, loadBalanceHistory } from "../services/sync.js";

export function registerSyncRoutes(app: FastifyInstance, db: Db): void {
  app.post("/api/sync", async () => syncAllAccounts(db));

  app.post("/api/sync/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!getAccount(db, id)) return reply.code(404).send({ error: "account not found" });
    return syncAccount(db, id);
  });

  app.get("/api/balance/history", async (request) => {
    const range = ((request.query as { range?: string }).range ?? "30D") as
      | "7D"
      | "30D"
      | "90D"
      | "1Y"
      | "ALL";
    return loadBalanceHistory(db, range);
  });
}
