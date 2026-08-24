/**
 * Public market data routes.
 * When STONE_FETCHER_URL is set (Japan VPS fetcher), data is proxied from
 * there; otherwise the server fetches directly (egress proxy aware).
 */
import type { FastifyInstance } from "fastify";
import { fetchMarketRadar, fetchFundingHeatmap } from "@stone/exchange/market";

const FETCHER_URL = process.env.STONE_FETCHER_URL ?? "";

async function fromFetcher(path: string): Promise<unknown | null> {
  if (!FETCHER_URL) return null;
  try {
    const res = await fetch(`${FETCHER_URL}${path}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null; // fetcher unreachable — fall back to direct
  }
}

export function registerMarketRoutes(app: FastifyInstance): void {
  app.get("/api/market-radar", async (_request, reply) => {
    try {
      const proxied = await fromFetcher("/api/market-radar");
      if (proxied) return proxied;
      return await fetchMarketRadar();
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get("/api/funding-heatmap", async (_request, reply) => {
    try {
      const proxied = await fromFetcher("/api/funding-heatmap");
      if (proxied) return proxied;
      return await fetchFundingHeatmap(24, 20);
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}
