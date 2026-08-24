/**
 * Quantity-aware FIFO fill pairing.
 *
 * The naive "lockstep" pairing (match buy[i] with sell[i]) breaks whenever
 * fills don't line up 1:1 — DCA entries, partial exits, or multiple fills at
 * the same price. This implementation consumes fill quantity the way an
 * exchange actually settles a position:
 *
 *   - A buy fill first closes the oldest open Short lot (FIFO), then any
 *     leftover quantity opens a new Long lot.
 *   - A sell fill first closes the oldest open Long lot (FIFO), then any
 *     leftover quantity opens a new Short lot.
 *
 * Commission is allocated pro-rata: each closed unit pays its share of the
 * opening fill's commission and the closing fill's commission.
 */

import type { ClosedTrade } from "../types"

export interface FillLike {
  symbol: string
  time: number      // epoch ms
  isBuy: boolean
  price: number
  qty: number
  commission: number
}

export interface PairedFill {
  symbol: string
  dir: "Long" | "Short"
  size: number
  entry: number
  exit: number
  entryTime: number
  exitTime: number
  commission: number
}

interface Lot {
  dir: "Long" | "Short"
  qty: number        // remaining quantity
  lotQty: number     // quantity at open (for pro-rata commission on partial close)
  price: number
  time: number
  entryComm: number  // opening fill commission attributed to this lot
}

export function pairFillsFIFO(fills: FillLike[]): PairedFill[] {
  const sorted = [...fills].sort((a, b) => a.time - b.time)

  const bySymbol = new Map<string, FillLike[]>()
  for (const f of sorted) {
    let arr = bySymbol.get(f.symbol)
    if (!arr) bySymbol.set(f.symbol, (arr = []))
    arr.push(f)
  }

  const results: PairedFill[] = []

  for (const [symbol, symFills] of bySymbol) {
    const longs: Lot[] = []
    const shorts: Lot[] = []
    let longHead = 0
    let shortHead = 0

    for (const f of symFills) {
      const qty = f.qty
      if (qty <= 0) continue

      const opening: Lot[] = f.isBuy ? longs : shorts
      const closing: Lot[] = f.isBuy ? shorts : longs
      let closingHead = f.isBuy ? shortHead : longHead

      let remaining = qty

      // Close the oldest open opposite-direction lots first.
      while (remaining > 0 && closingHead < closing.length) {
        const lot = closing[closingHead]
        const closeQty = Math.min(lot.qty, remaining)

        // Pro-rata commission: lot's opening commission + this fill's commission.
        const entryCommShare = lot.lotQty > 0 ? lot.entryComm * (closeQty / lot.lotQty) : 0
        const exitCommShare = qty > 0 ? f.commission * (closeQty / qty) : 0

        results.push({
          symbol,
          dir: lot.dir,
          size: closeQty,
          entry: lot.price,
          exit: f.price,
          entryTime: lot.time,
          exitTime: f.time,
          commission: entryCommShare + exitCommShare,
        })

        lot.qty -= closeQty
        remaining -= closeQty
        if (lot.qty <= 0) closingHead++
      }

      // Persist the closing queue head.
      if (f.isBuy) shortHead = closingHead
      else longHead = closingHead

      // Leftover quantity opens a new lot in the opening direction.
      if (remaining > 0) {
        opening.push({
          dir: f.isBuy ? "Long" : "Short",
          qty: remaining,
          lotQty: remaining,
          price: f.price,
          time: f.time,
          entryComm: qty > 0 ? f.commission * (remaining / qty) : 0,
        })
      }
    }
  }

  return results
}

// ─── ClosedTrade construction ───────────────────────────────────────────────

export function formatHoldTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Convert PairedFill results into ClosedTrade records (shared by Binance/Bybit).
 */
export function buildClosedTrades(
  paired: PairedFill[],
  exchange: "Binance" | "Bybit",
  seqStart: number
): ClosedTrade[] {
  let seq = seqStart
  const round2 = (n: number) => Math.round(n * 100) / 100

  return paired
    .map((p) => {
      const rawPnl =
        p.dir === "Long"
          ? (p.exit - p.entry) * p.size
          : (p.entry - p.exit) * p.size
      const realisedPnl = rawPnl - p.commission

      return {
        id: seq--,
        symbol: p.symbol,
        dir: p.dir,
        size: p.size,
        entry: p.entry,
        exit: p.exit,
        holdTime: formatHoldTime(p.exitTime - p.entryTime),
        realisedPnl: round2(realisedPnl),
        rMultiple: round2(realisedPnl / (Math.abs(realisedPnl) + 1)),
        exchange,
        account: "Main Account",
        entryTime: new Date(p.entryTime).toISOString(),
        exitTime: new Date(p.exitTime).toISOString(),
        sequence: seq + 1,
        isWin: realisedPnl > 0,
        isBreakeven: realisedPnl === 0,
      }
    })
    .sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime())
}
