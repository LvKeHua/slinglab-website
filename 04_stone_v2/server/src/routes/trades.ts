/**
 * Manual trade entry + chart upload routes.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Db } from "../db.js";
import { saveUpload, readUpload } from "../services/uploads.js";

const ManualTradeBody = z.object({
  symbol: z.string().min(1),
  dir: z.enum(["Long", "Short"]),
  size: z.number().nonnegative().optional(),
  entry: z.number(),
  exit: z.number(),
  entryTime: z.string().optional(),
  exitTime: z.string().optional(),
  fees: z.number().nonnegative().optional(),
});

const UploadBody = z.object({ dataUrl: z.string().min(1) });

function formatHoldTime(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

export function registerTradeRoutes(app: FastifyInstance, db: Db): void {
  app.post("/api/trades/manual", async (request, reply) => {
    const parsed = ManualTradeBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "invalid body" });
    }
    const body = parsed.data;
    const size = Math.abs(body.size ?? 0);
    const fees = Math.abs(body.fees ?? 0);
    const entryTime = body.entryTime ? new Date(body.entryTime).toISOString() : new Date().toISOString();
    const exitTime = body.exitTime ? new Date(body.exitTime).toISOString() : new Date().toISOString();
    const priceDiff = body.dir === "Long" ? body.exit - body.entry : body.entry - body.exit;
    const realisedPnl = Math.round((priceDiff * size - fees) * 100) / 100;
    const risk = Math.abs(body.entry - body.exit) * size;
    const rMultiple = risk > 0 ? Math.round((realisedPnl / risk) * 100) / 100 : 0;
    const holdTime = formatHoldTime(new Date(exitTime).getTime() - new Date(entryTime).getTime());
    const result = db
      .prepare(
        `INSERT INTO closed_trades
         (symbol, dir, size, entry, exit, hold_time, realised_pnl, r_multiple,
          exchange, account, entry_time, exit_time, sequence, is_win, is_breakeven)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Manual', 'Manual', ?, ?, 0, ?, ?)`,
      )
      .run(
        body.symbol.toUpperCase(),
        body.dir,
        size,
        body.entry,
        body.exit,
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

  app.post("/api/uploads", async (request, reply) => {
    const parsed = UploadBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "dataUrl is required" });
    try {
      return saveUpload(parsed.data.dataUrl);
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
}
