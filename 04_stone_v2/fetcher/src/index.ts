/**
 * Stone Fetcher — 日本 VPS 数据抓钩。
 *
 * 部署在日本 VPS（限制少、直连交易所），负责：
 *  1. 公开市场数据抓取（行情/资金费率/爆仓/热力图）→ 缓存到本地 SQLite
 *  2. 通过 HTTP 把数据推送给美国 VPS 的 Stone Server（计算+存储）
 *
 * 美国 VPS 的 server 通过 STONE_FETCHER_URL 指向本服务；本服务不可达时
 * server 自动回退到直连（当前行为）。
 */
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { fetchMarketRadar, fetchFundingHeatmap } from "@stone/exchange/market";

const PORT = Number(process.env.FETCHER_PORT ?? 8780);
const HOST = process.env.FETCHER_HOST ?? "0.0.0.0";
const CACHE_TTL_MS = Number(process.env.FETCHER_CACHE_TTL_MS ?? 30_000);

interface CacheEntry {
  data: unknown;
  at: number;
}

export async function buildFetcher(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  const cache = new Map<string, CacheEntry>();

  async function cached(key: string, producer: () => Promise<unknown>): Promise<unknown> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
    const data = await producer();
    cache.set(key, { data, at: Date.now() });
    return data;
  }

  app.get("/healthz", async () => ({ ok: true, role: "fetcher", cachedKeys: cache.size }));

  app.get("/api/market-radar", async (_request, reply) => {
    try {
      return await cached("market-radar", fetchMarketRadar);
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get("/api/funding-heatmap", async (_request, reply) => {
    try {
      return await cached("funding-heatmap", () => fetchFundingHeatmap(24, 20));
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return app;
}

const app = await buildFetcher();
try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`Stone Fetcher listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
