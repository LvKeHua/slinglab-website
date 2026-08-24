# Plan: Full Trade Coverage via KV-Batched Syncing

## Objective
Enable the dashboard to display trade history for ALL Binance USDT trading pairs (~200+) and all Bybit executions, without exceeding the Cloudflare Worker Free plan's 50-subrequest limit.

## Architecture: The Rolling Refresh
Since we cannot query 200+ symbols in one invocation, we distribute the workload across multiple cron triggers using a "Rolling Refresh" strategy.

### 1. KV State Management
We will use the following KV keys to maintain state across invocations:
- `binance_symbols`: `string[]` - Full list of active USDT trading pairs (refreshed daily).
- `sync_cursor`: `{ batchIndex: number, totalBatches: number, lastFullSync: string }` - Tracks which slice of symbols is being processed.
- `binance_trades_cache`: `ClosedTrade[]` - The master list of all paired Binance trades.
- `bybit_trades_cache`: `ClosedTrade[]` - All Bybit trades (updated every cron cycle).

### 2. The Sync Engine (Cron Trigger)
Every 5 minutes, the `scheduled` handler will:
1. **Refresh Symbols**: If `binance_symbols` is missing or >24h old, call `fetchBinanceSpotSymbols` to get all USDT pairs.
2. **Identify Batch**: 
   - Read `sync_cursor`.
   - Calculate the current batch range: `[batchIndex * 20, (batchIndex + 1) * 20)`.
3. **Fetch Trades**:
   - Query `myTrades` for the ~20 symbols in the current batch.
   - Fetch Bybit trade executions (up to 5 pages).
4. **Merge and Cache**:
   - Merge new Binance trades into `binance_trades_cache` (deduplicating by trade ID/timestamp).
   - Overwrite `bybit_trades_cache` with fresh results.
5. **Update Cursor**:
   - Increment `batchIndex`.
   - If `batchIndex >= totalBatches`, reset to 0 and update `lastFullSync`.

### 3. The Dashboard Handler (Request)
The dashboard will transition from "Live Fetch" to "Cache-First":
1. **Trades**: Read `binance_trades_cache` and `bybit_trades_cache` directly from KV (0 subrequests).
2. **Fresh Data**: Live fetch account balances (using bulk price endpoint) and futures positions (~3-5 subrequests).
3. **Result**: Instant response with comprehensive trade history.

## Implementation Roadmap

### Phase 1: Sync Infrastructure
- [ ] Create `worker/src/services/sync.service.ts` to implement the batching and merging logic.
- [ ] Update `worker/src/index.ts` to call the sync engine in the `scheduled` handler.

### Phase 2: Dashboard Integration
- [ ] Refactor `aggregateTrades` in `worker/src/utils/aggregator.ts` to accept cached trade data.
- [ ] Update `dashboard.handler.ts` to fetch trades from KV before falling back to live limited fetches.

### Phase 3: Verification
- [ ] Trigger multiple cron runs and verify `binance_trades_cache` grows in size.
- [ ] Verify dashboard displays trades from symbols outside the initial `knownPairs` list.

## Subrequest Budget Analysis (Free Plan)
- **Cron Request**: 1 (account) + 20 (myTrades) + 1 (exchangeInfo optional) + 5 (Bybit) = ~27 subrequests. ✅
- **Dashboard Request**: 1 (account) + 1 (bulk prices) + 1 (futures) + 0 (KV reads) = ~3 subrequests. ✅
