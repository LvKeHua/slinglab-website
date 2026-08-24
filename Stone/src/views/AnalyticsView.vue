<script setup>
import { computed } from 'vue'
import { useTrades } from '../composables/useTrades.js'

const { trades, pnlColor, pnlText, fetchTrades } = useTrades()

fetchTrades()

const winRate = computed(() => {
  if (!trades.value.length) return '-'
  const wins = trades.value.filter(t => t.status === 'win').length
  return (wins / trades.value.length * 100).toFixed(1) + '%'
})

const profitRatio = computed(() => {
  const winsTotal = trades.value.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const lossesTotal = trades.value.filter(t => t.pnl < 0).reduce((s, t) => s + Math.abs(t.pnl), 0)
  if (lossesTotal > 0) return (winsTotal / lossesTotal).toFixed(2)
  if (winsTotal > 0) return '∞'
  return '-'
})

const avgPnl = computed(() => {
  if (!trades.value.length) return '-'
  const total = trades.value.reduce((s, t) => s + (t.pnl || 0), 0)
  return pnlText(total / trades.value.length)
})

const totalPnl = computed(() => {
  return trades.value.reduce((s, t) => s + (t.pnl || 0), 0)
})

const symbolStats = computed(() => {
  const map = {}
  trades.value.forEach(t => {
    if (!map[t.symbol]) map[t.symbol] = { trades: [], wins: 0 }
    map[t.symbol].trades.push(t)
    if (t.pnl > 0) map[t.symbol].wins++
  })
  return Object.entries(map).map(([sym, data]) => ({
    symbol: sym,
    count: data.trades.length,
    winRate: (data.wins / data.trades.length * 100).toFixed(1) + '%',
    pnl: data.trades.reduce((s, t) => s + (t.pnl || 0), 0)
  }))
})
</script>

<template>
  <header>
    <h1>交易分析</h1>
  </header>

  <div class="stats-grid">
    <div class="stat-card">
      <h3>总交易数</h3>
      <p>{{ trades.length }}</p>
    </div>
    <div class="stat-card">
      <h3>胜率</h3>
      <p>{{ winRate }}</p>
    </div>
    <div class="stat-card">
      <h3>盈亏比</h3>
      <p>{{ profitRatio }}</p>
    </div>
    <div class="stat-card">
      <h3>平均盈亏</h3>
      <p :style="{ color: pnlColor(totalPnl) }">{{ avgPnl }}</p>
    </div>
  </div>

  <section class="analytics-section">
    <h2>品种统计</h2>
    <table>
      <thead>
        <tr>
          <th>品种</th>
          <th>交易数</th>
          <th>胜率</th>
          <th>总盈亏</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in symbolStats" :key="s.symbol">
          <td>{{ s.symbol }}</td>
          <td>{{ s.count }}</td>
          <td>{{ s.winRate }}</td>
          <td :style="{ color: pnlColor(s.pnl) }">{{ pnlText(s.pnl) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.analytics-section {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
}
.analytics-section h2 {
  margin-bottom: 16px;
}
</style>
