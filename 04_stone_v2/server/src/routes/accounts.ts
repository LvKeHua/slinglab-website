/**
 * Account + group routes.
 */
import type { FastifyInstance } from "fastify";
import type { Db } from "../db.js";
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  listGroups,
  createGroup,
  deleteGroup,
} from "../services/accounts.js";

export function registerAccountRoutes(app: FastifyInstance, db: Db): void {
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
}
