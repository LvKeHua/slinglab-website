/**
 * Quantity-aware FIFO fill pairing — ported from stone crypto worker.
 * A buy fill first closes the oldest open Short lot (FIFO), then any
 * leftover quantity opens a new Long lot. Commission is allocated pro-rata.
 */

export interface FillLike {
  symbol: string;
  time: number; // epoch ms
  isBuy: boolean;
  price: number;
  qty: number;
  commission: number;
}

export interface PairedFill {
  symbol: string;
  dir: "Long" | "Short";
  size: number;
  entry: number;
  exit: number;
  entryTime: number;
  exitTime: number;
  realisedPnl: number;
  fees: number;
}

interface Lot {
  qty: number;
  price: number;
  time: number;
  commission: number;
}

export function pairFillsFIFO(fills: FillLike[]): PairedFill[] {
  const sorted = [...fills].sort((a, b) => a.time - b.time);
  const longs: Lot[] = [];
  const shorts: Lot[] = [];
  const closed: PairedFill[] = [];

  for (const fill of sorted) {
    if (fill.isBuy) {
      // Close oldest Short lots first, then open Long
      let remaining = fill.qty;
      while (remaining > 0 && shorts.length > 0) {
        const lot = shorts[0];
        const closeQty = Math.min(remaining, lot.qty);
        const entry = lot.price;
        const exit = fill.price;
        const pnl = (entry - exit) * closeQty;
        const fees = (lot.commission / Math.max(lot.qty, 1e-12)) * closeQty +
          (fill.commission / Math.max(fill.qty, 1e-12)) * closeQty;
        closed.push({
          symbol: fill.symbol,
          dir: "Short",
          size: closeQty,
          entry,
          exit,
          entryTime: lot.time,
          exitTime: fill.time,
          realisedPnl: pnl - fees,
          fees,
        });
        lot.qty -= closeQty;
        remaining -= closeQty;
        if (lot.qty <= 1e-12) shorts.shift();
      }
      if (remaining > 0) {
        longs.push({
          qty: remaining,
          price: fill.price,
          time: fill.time,
          commission: (fill.commission / Math.max(fill.qty, 1e-12)) * remaining,
        });
      }
    } else {
      // Close oldest Long lots first, then open Short
      let remaining = fill.qty;
      while (remaining > 0 && longs.length > 0) {
        const lot = longs[0];
        const closeQty = Math.min(remaining, lot.qty);
        const entry = lot.price;
        const exit = fill.price;
        const pnl = (exit - entry) * closeQty;
        const fees = (lot.commission / Math.max(lot.qty, 1e-12)) * closeQty +
          (fill.commission / Math.max(fill.qty, 1e-12)) * closeQty;
        closed.push({
          symbol: fill.symbol,
          dir: "Long",
          size: closeQty,
          entry,
          exit,
          entryTime: lot.time,
          exitTime: fill.time,
          realisedPnl: pnl - fees,
          fees,
        });
        lot.qty -= closeQty;
        remaining -= closeQty;
        if (lot.qty <= 1e-12) longs.shift();
      }
      if (remaining > 0) {
        shorts.push({
          qty: remaining,
          price: fill.price,
          time: fill.time,
          commission: (fill.commission / Math.max(fill.qty, 1e-12)) * remaining,
        });
      }
    }
  }

  return closed;
}

export function formatHoldTime(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

export interface ClosedTrade {
  id: number;
  symbol: string;
  dir: "Long" | "Short";
  size: number;
  entry: number;
  exit: number;
  holdTime: string;
  realisedPnl: number;
  rMultiple: number;
  exchange: string;
  account: string;
  entryTime: string;
  exitTime: string;
  sequence: number;
  isWin: boolean;
  isBreakeven: boolean;
}

export function buildClosedTrades(
  paired: PairedFill[],
  exchange: string,
  account: string,
  seqStart: number,
): ClosedTrade[] {
  return paired.map((p, i) => {
    const holdMs = p.exitTime - p.entryTime;
    const risk = Math.abs(p.entry - p.exit) * p.size;
    const rMultiple = risk > 0 ? p.realisedPnl / risk : 0;
    return {
      id: seqStart + i,
      symbol: p.symbol,
      dir: p.dir,
      size: p.size,
      entry: p.entry,
      exit: p.exit,
      holdTime: formatHoldTime(holdMs),
      realisedPnl: Math.round(p.realisedPnl * 100) / 100,
      rMultiple: Math.round(rMultiple * 100) / 100,
      exchange,
      account,
      entryTime: new Date(p.entryTime).toISOString(),
      exitTime: new Date(p.exitTime).toISOString(),
      sequence: seqStart + i,
      isWin: p.realisedPnl > 0,
      isBreakeven: p.realisedPnl === 0,
    };
  });
}
