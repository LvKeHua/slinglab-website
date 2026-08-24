"use client"

import { useMemo } from "react"
import type { ClosedTrade, TraderBias, DashboardTimeRange } from "@/types"
import { getTradingDays } from "@/lib/time-filters"

export interface CMMMetrics {
  totalGainLoss: number         // Total Gain/Loss (sum of all PnL)
  avgDailyGain: number          // Avg Daily Gain (totalPnL / trading days)
  largestGain: number           // Largest Gain (best single trade)
  avgTradesPerDay: number        // Avg # of Trades/day
  avgTradeLoss: number          // Avg Trade Loss (avg of losing trades' absolute PnL)
  maxConsecutiveWin: number     // Max Consecutive Win streak
  tradeExpectancy: number       // Trade Expectancy (avg PnL per trade)
  avgDailyVolume: number        // Avg Daily Volume (total notional volume / trading days)
  totalTradesVolume: number     // Total Trades Volume (sum of |size * entry|)
  avgTradeWin: number           // Avg Trade Win (avg of winning trades' PnL)
  maxConsecutiveLoss: number    // Max Consecutive Loss streak
  largestLoss: number           // Largest Loss (worst single trade)
}

export function useAnalytics(closedTrades: ClosedTrade[]): {
  metrics: CMMMetrics
  bias: TraderBias
  todayPnL: number
  todayTrades: number
  weekPnL: number
  filteredTrades: ClosedTrade[]
} {
  return useMemo(() => {
    const empty: CMMMetrics = {
      totalGainLoss: 0,
      avgDailyGain: 0,
      largestGain: 0,
      avgTradesPerDay: 0,
      avgTradeLoss: 0,
      maxConsecutiveWin: 0,
      tradeExpectancy: 0,
      avgDailyVolume: 0,
      totalTradesVolume: 0,
      avgTradeWin: 0,
      maxConsecutiveLoss: 0,
      largestLoss: 0,
    }

    if (!closedTrades || closedTrades.length === 0) {
      return {
        metrics: empty,
        bias: "NEUTRAL" as TraderBias,
        todayPnL: 0,
        todayTrades: 0,
        weekPnL: 0,
        filteredTrades: [],
      }
    }

    const wins = closedTrades.filter((t) => t.isWin)
    const losses = closedTrades.filter((t) => !t.isWin && !t.isBreakeven)
    const totalPnL = closedTrades.reduce((s, t) => s + t.realisedPnl, 0)
    const grossWin = wins.reduce((s, t) => s + t.realisedPnl, 0)
    const grossLoss = losses.reduce((s, t) => s + t.realisedPnl, 0) // negative sum
    const tradingDays = getTradingDays(closedTrades)

    // Max consecutive wins/losses
    let maxConsecWins = 0
    let maxConsecLosses = 0
    let consecWins = 0
    let consecLosses = 0
    for (const t of closedTrades) {
      if (t.isWin) {
        consecWins++
        consecLosses = 0
        maxConsecWins = Math.max(maxConsecWins, consecWins)
      } else if (!t.isBreakeven) {
        consecLosses++
        consecWins = 0
        maxConsecLosses = Math.max(maxConsecLosses, consecLosses)
      } else {
        consecWins = 0
        consecLosses = 0
      }
    }

    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0
    let bias: TraderBias = "NEUTRAL"
    if (winRate >= 55 && totalPnL > 0) bias = "BULLISH"
    else if (winRate <= 45 || (totalPnL < 0 && winRate < 50)) bias = "BEARISH"

    // Today's PnL
    const today = new Date().toISOString().slice(0, 10)
    const todayTrades = closedTrades.filter((t) => t.exitTime.slice(0, 10) === today)
    const todayPnL = todayTrades.reduce((s, t) => s + t.realisedPnl, 0)

    // This week's PnL
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekTrades = closedTrades.filter((t) => new Date(t.exitTime) >= weekStart)
    const weekPnL = weekTrades.reduce((s, t) => s + t.realisedPnl, 0)

    const totalVolume = closedTrades.reduce((s, t) => s + Math.abs(t.size * t.entry), 0)
    const metrics: CMMMetrics = {
      totalGainLoss: totalPnL,
      avgDailyGain: tradingDays > 0 ? totalPnL / tradingDays : 0,
      largestGain: closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.realisedPnl)) : 0,
      avgTradesPerDay: tradingDays > 0 ? closedTrades.length / tradingDays : 0,
      avgTradeLoss: losses.length > 0 ? Math.abs(grossLoss) / losses.length : 0,
      maxConsecutiveWin: maxConsecWins,
      tradeExpectancy: closedTrades.length > 0 ? totalPnL / closedTrades.length : 0,
      avgDailyVolume: tradingDays > 0 ? totalVolume / tradingDays : 0,
      totalTradesVolume: totalVolume,
      avgTradeWin: wins.length > 0 ? grossWin / wins.length : 0,
      maxConsecutiveLoss: maxConsecLosses,
      largestLoss: closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.realisedPnl)) : 0,
    }

    return { metrics, bias, todayPnL, todayTrades: todayTrades.length, weekPnL, filteredTrades: closedTrades }
  }, [closedTrades])
}