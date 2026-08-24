/**
 * On-chain wallet routes (DeBank EVM / CoinStats Solana-Sui-Cosmos).
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Db } from "../db.js";
import { fetchDebankWallet, fetchCoinstatsWallet } from "../services/wallets.js";

const WalletBody = z.object({
  chain: z.enum(["evm", "solana", "sui", "cosmos"]),
  name: z.string().optional(),
  address: z.string().min(1),
});

export function registerWalletRoutes(app: FastifyInstance, db: Db): void {
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
    const parsed = WalletBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "chain and address are required" });
    const body = parsed.data;
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
}
