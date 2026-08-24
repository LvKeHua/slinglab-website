/**
 * Journal / scorecards / strategies / sticky notes routes (Mazino-style).
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Db } from "../db.js";

const JournalBody = z.object({
  tradeId: z.string().optional(),
  trade: z.string().min(1),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  chartUrls: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  emotions: z.array(z.string()).optional(),
});

const ScorecardBody = z.object({
  symbol: z.string().min(1),
  direction: z.string().optional(),
  entry: z.number().nullable().optional(),
  exit: z.number().nullable().optional(),
  rMultiple: z.number().optional(),
  pnl: z.number().optional(),
  grade: z.number().nullable().optional(),
  checks: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const StrategyBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  rules: z.array(z.string()).optional(),
});

const NoteBody = z.object({
  content: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
});

export function registerJournalRoutes(app: FastifyInstance, db: Db): void {
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
    const parsed = JournalBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "trade is required" });
    const body = parsed.data;
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
    const parsed = ScorecardBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "symbol is required" });
    const body = parsed.data;
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
    const parsed = StrategyBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "name is required" });
    const body = parsed.data;
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

  app.get("/api/notes", async () => {
    const rows = db.prepare("SELECT * FROM sticky_notes ORDER BY created_at").all() as Array<{
      id: number; content: string; x: number; y: number; w: number; h: number; created_at: string;
    }>;
    return rows.map((r) => ({ id: String(r.id), content: r.content, x: r.x, y: r.y, w: r.w, h: r.h, createdAt: r.created_at }));
  });

  app.post("/api/notes", async (request, reply) => {
    const parsed = NoteBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid body" });
    const body = parsed.data;
    const result = db
      .prepare("INSERT INTO sticky_notes (content, x, y, w, h) VALUES (?, ?, ?, ?, ?)")
      .run(body.content ?? "", body.x ?? 20, body.y ?? 20, body.w ?? 260, body.h ?? 180);
    return { id: String(result.lastInsertRowid) };
  });

  app.patch("/api/notes/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const parsed = NoteBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid body" });
    const body = parsed.data;
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
}
