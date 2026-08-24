/**
 * Gate CrossEx API client — ported from gate-crossex (AGPL-3.0).
 * Read-only subset: account balances, positions, and history trades.
 * One Gate API key covers Gate / Binance / OKX / Bybit / Kraken /
 * Hyperliquid / Deribit through the CrossEx unified account.
 */
import { createHash, createHmac } from "node:crypto";
import { z } from "zod";

const PRODUCTION_BASE_URL = "https://api.gateio.ws/api/v4";
const ACCOUNT_ENDPOINT = "/crossex/accounts";
const POSITIONS_ENDPOINT = "/crossex/positions";
const MARGIN_POSITIONS_ENDPOINT = "/crossex/margin_positions";
const HISTORY_TRADES_ENDPOINT = "/crossex/history_trades";

export interface GateCredentials {
  apiKey: string;
  apiSecret: string;
}

const GateAccountAssetSchema = z.object({
  coin: z.string(),
  available: z.string(),
  locked: z.string(),
  borrowed: z.string(),
  initial_margin: z.string(),
  maintenance_margin: z.string(),
  unrealised_pnl: z.string(),
  total: z.string(),
  equity: z.string(),
});

const GateAccountSchema = z.object({
  user_id: z.string(),
  exchange_type: z.string(),
  available: z.string(),
  initial_margin: z.string(),
  maintenance_margin: z.string(),
  unrealised_pnl: z.string(),
  total: z.string(),
  equity: z.string(),
  assets: z.array(GateAccountAssetSchema),
});
export type GateCrossExAccount = z.infer<typeof GateAccountSchema>;

const GatePositionSchema = z.object({
  position_id: z.string(),
  symbol: z.string(),
  exchange_type: z.string(),
  business_type: z.string(),
  position_side: z.string(),
  qty: z.string(),
  entry_price: z.string(),
  mark_price: z.string(),
  unrealised_pnl: z.string(),
  leverage: z.string(),
  liquidation_price: z.string(),
});
export type GateCrossExPosition = z.infer<typeof GatePositionSchema>;

const GateMarginPositionSchema = z.object({
  position_id: z.string(),
  symbol: z.string(),
  exchange_type: z.string(),
  business_type: z.string(),
  position_side: z.string(),
  asset_quantity: z.string(),
  asset_coin: z.string(),
  value: z.string(),
  liability: z.string(),
  liability_coin: z.string(),
  interest: z.string(),
});
export type GateCrossExMarginPosition = z.infer<typeof GateMarginPositionSchema>;

const GateTradeSchema = z.object({
  transaction_id: z.string(),
  order_id: z.string(),
  text: z.string(),
  symbol: z.string(),
  exchange_type: z.string(),
  business_type: z.string(),
  side: z.string(),
  qty: z.string(),
  price: z.string(),
  fee: z.string(),
  fee_coin: z.string(),
  fee_rate: z.string(),
  match_role: z.string(),
  rpnl: z.string(),
  position_mode: z.string(),
  position_side: z.string(),
  create_time: z.string(),
});
export type GateCrossExTrade = z.infer<typeof GateTradeSchema>;

export interface GateCrossExPortfolio {
  account: GateCrossExAccount;
  positions: GateCrossExPosition[];
  marginPositions: GateCrossExMarginPosition[];
  recentTrades: GateCrossExTrade[];
}

export class GateApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly label: string,
    readonly retryAfterMs?: number,
  ) {
    super(`Gate API request failed with ${label}`);
    this.name = "GateApiError";
  }
}

export function signGateRequest(input: {
  method: "GET" | "POST" | "PUT" | "DELETE";
  requestPath: string;
  queryString: string;
  body: string;
  timestamp: string;
  secret: string;
}): string {
  const bodyHash = createHash("sha512").update(input.body).digest("hex");
  const signatureString = [
    input.method,
    input.requestPath,
    input.queryString,
    bodyHash,
    input.timestamp,
  ].join("\n");
  return createHmac("sha512", input.secret).update(signatureString).digest("hex");
}

export class GateCrossExClient {
  private readonly authenticatedRequestQueue: Array<{
    priority: number;
    sequence: number;
    work: () => Promise<unknown>;
    resolve(value: unknown): void;
    reject(error: unknown): void;
  }> = [];
  private authenticatedRequestActive = false;
  private authenticatedRequestSequence = 0;
  private nextAuthenticatedRequestAt = 0;
  private authenticatedCooldownUntil = 0;

  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
    private readonly baseUrl: string = PRODUCTION_BASE_URL,
    private readonly authenticatedRequestSpacingMs = 100,
  ) {}

  async queryAccount(credentials: GateCredentials, exchangeType?: string): Promise<GateCrossExAccount> {
    const queryString = exchangeType
      ? new URLSearchParams({ exchange_type: exchangeType.toUpperCase() }).toString()
      : "";
    return this.signedRequest("GET", ACCOUNT_ENDPOINT, queryString, "", credentials, GateAccountSchema, "INVALID_ACCOUNT_RESPONSE");
  }

  async queryPositions(credentials: GateCredentials): Promise<GateCrossExPosition[]> {
    return this.signedRequest("GET", POSITIONS_ENDPOINT, "", "", credentials, z.array(GatePositionSchema), "INVALID_POSITIONS_RESPONSE");
  }

  async queryPortfolio(credentials: GateCredentials): Promise<GateCrossExPortfolio> {
    const historyQuery = new URLSearchParams({ page: "1", limit: "100" }).toString();
    const [account, positions, marginPositions, recentTrades] = await Promise.all([
      this.signedRequest("GET", ACCOUNT_ENDPOINT, "", "", credentials, GateAccountSchema, "INVALID_ACCOUNT_RESPONSE", "low"),
      this.signedRequest("GET", POSITIONS_ENDPOINT, "", "", credentials, z.array(GatePositionSchema), "INVALID_POSITIONS_RESPONSE", "low"),
      this.signedRequest("GET", MARGIN_POSITIONS_ENDPOINT, "", "", credentials, z.array(GateMarginPositionSchema), "INVALID_MARGIN_POSITIONS_RESPONSE", "low"),
      this.signedRequest("GET", HISTORY_TRADES_ENDPOINT, historyQuery, "", credentials, z.array(GateTradeSchema), "INVALID_TRADES_RESPONSE", "low"),
    ]);
    return { account, positions, marginPositions, recentTrades };
  }

  private async signedRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    queryString: string,
    body: string,
    credentials: GateCredentials,
    schema: z.ZodType<T>,
    invalidSchemaLabel: string,
    priority: "urgent" | "high" | "normal" | "low" = "normal",
  ): Promise<T> {
    const requestPath = `/api/v4${endpoint}`;
    const response = await this.scheduleAuthenticatedRequest(async () => {
      try {
        const timestamp = Math.floor(this.now() / 1_000).toString();
        const signature = signGateRequest({
          method,
          requestPath,
          queryString,
          body,
          timestamp,
          secret: credentials.apiSecret,
        });
        const suffix = queryString ? `?${queryString}` : "";
        const received = await this.fetchImplementation(`${this.baseUrl}${endpoint}${suffix}`, {
          method,
          headers: {
            Accept: "application/json",
            ...(body ? { "Content-Type": "application/json" } : {}),
            KEY: credentials.apiKey,
            Timestamp: timestamp,
            SIGN: signature,
          },
          ...(body ? { body } : {}),
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        });
        if (received.status === 429) {
          this.authenticatedCooldownUntil = Math.max(
            this.authenticatedCooldownUntil,
            Date.now() + this.retryAfterMs(received.headers.get("Retry-After")),
          );
        }
        return received;
      } catch {
        throw new GateApiError(0, "NETWORK_ERROR");
      }
    }, priority);

    const responseText = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new GateApiError(response.status, "INVALID_JSON_RESPONSE");
    }

    if (!response.ok) {
      const errorPayload = z.object({ label: z.string() }).safeParse(payload);
      const label = errorPayload.success && /^[A-Z0-9_]{1,80}$/.test(errorPayload.data.label)
        ? errorPayload.data.label
        : "UNKNOWN_GATE_ERROR";
      const retryAfterMs = response.status === 429 ? this.retryAfterMs(response.headers.get("Retry-After")) : undefined;
      if (retryAfterMs !== undefined) {
        this.authenticatedCooldownUntil = Math.max(this.authenticatedCooldownUntil, Date.now() + retryAfterMs);
      }
      throw new GateApiError(response.status, label, retryAfterMs);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new GateApiError(response.status, invalidSchemaLabel);
    return parsed.data;
  }

  private scheduleAuthenticatedRequest<T>(
    work: () => Promise<T>,
    priority: "urgent" | "high" | "normal" | "low",
  ): Promise<T> {
    const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 }[priority];
    const { promise, resolve, reject } = Promise.withResolvers<T>();
    this.authenticatedRequestQueue.push({
      priority: priorityRank,
      sequence: this.authenticatedRequestSequence++,
      work,
      resolve: (value) => resolve(value as T),
      reject,
    });
    this.authenticatedRequestQueue.sort(
      (left, right) => left.priority - right.priority || left.sequence - right.sequence,
    );
    void this.drainAuthenticatedRequestQueue();
    return promise;
  }

  private async drainAuthenticatedRequestQueue(): Promise<void> {
    if (this.authenticatedRequestActive) return;
    this.authenticatedRequestActive = true;
    try {
      while (this.authenticatedRequestQueue.length > 0) {
        const queued = this.authenticatedRequestQueue.shift();
        if (!queued) continue;
        const now = Date.now();
        const waitMs = Math.max(0, this.nextAuthenticatedRequestAt - now, this.authenticatedCooldownUntil - now);
        if (waitMs > 0) {
          const { promise, resolve } = Promise.withResolvers<void>();
          setTimeout(resolve, waitMs);
          await promise;
        }
        this.nextAuthenticatedRequestAt = Date.now() + this.authenticatedRequestSpacingMs;
        try {
          queued.resolve(await queued.work());
        } catch (error) {
          queued.reject(error);
        }
      }
    } finally {
      this.authenticatedRequestActive = false;
      if (this.authenticatedRequestQueue.length > 0) void this.drainAuthenticatedRequestQueue();
    }
  }

  private retryAfterMs(value: string | null): number {
    if (!value) return 30_000;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.max(1_000, seconds * 1_000);
    const date = Date.parse(value);
    return Number.isFinite(date) ? Math.max(1_000, date - Date.now()) : 30_000;
  }
}
