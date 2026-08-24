/**
 * Settings + auth routes (exchange keys, data providers, site password).
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Db } from "../db.js";
import { getSetting, setSetting } from "../db.js";
import { listAccounts, updateAccount } from "../services/accounts.js";
import { syncAccount } from "../services/sync.js";

const KeysBody = z.object({
  exchange: z.string().min(1),
  apiKey: z.string().optional(),
  secretKey: z.string().optional(),
});

const ProvidersBody = z.object({
  debankAccessKey: z.string().optional(),
  coinstatsApiKey: z.string().optional(),
});

const PasswordBody = z.object({ password: z.string().min(6) });

const LoginBody = z.object({ password: z.string().optional() });

export function registerSettingsRoutes(app: FastifyInstance, db: Db): void {
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
    const parsed = KeysBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "exchange required" });
    const body = parsed.data;
    const account = listAccounts(db).find((a) => a.exchange === body.exchange);
    if (!account) return reply.code(404).send({ error: `no ${body.exchange} account configured` });
    updateAccount(db, account.id, { apiKey: body.apiKey, secretKey: body.secretKey });
    return { success: true };
  });

  app.delete("/api/v1/settings/keys", async (request, reply) => {
    const parsed = KeysBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "exchange required" });
    const account = listAccounts(db).find((a) => a.exchange === parsed.data.exchange);
    if (!account) return reply.code(404).send({ error: `no ${parsed.data.exchange} account configured` });
    updateAccount(db, account.id, { apiKey: "", secretKey: "" });
    return { success: true };
  });

  app.post("/api/v1/settings/test", async (request, reply) => {
    const parsed = KeysBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, valid: false, error: "exchange required" });
    const account = listAccounts(db).find((a) => a.exchange === parsed.data.exchange);
    if (!account) return reply.code(400).send({ success: false, valid: false, error: "No keys configured" });
    const result = await syncAccount(db, account.id);
    return {
      success: result.status === "ok",
      valid: result.status === "ok",
      error: result.message,
    };
  });

  app.get("/api/v1/settings/providers", async () => ({
    debankAccessKey: getSetting(db, "debank_access_key") ?? "",
    coinstatsApiKey: getSetting(db, "coinstats_api_key") ?? "",
  }));

  app.post("/api/v1/settings/providers", async (request, reply) => {
    const parsed = ProvidersBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid body" });
    if (parsed.data.debankAccessKey !== undefined) setSetting(db, "debank_access_key", parsed.data.debankAccessKey);
    if (parsed.data.coinstatsApiKey !== undefined) setSetting(db, "coinstats_api_key", parsed.data.coinstatsApiKey);
    return { success: true };
  });

  app.post("/api/v1/login", async (request, reply) => {
    const parsed = LoginBody.safeParse(request.body);
    const expected = getSetting(db, "site_password");
    if (!expected) return { ok: true }; // no password configured — open
    if (parsed.success && parsed.data.password === expected) {
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
    const parsed = PasswordBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "password must be at least 6 characters" });
    }
    setSetting(db, "site_password", parsed.data.password);
    return { success: true };
  });
}
