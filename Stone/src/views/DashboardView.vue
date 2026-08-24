<script setup>
import { computed, onMounted } from 'vue'
import { useTrades } from '../composables/useTrades.js'

const { trades, pnlColor, pnlText, fetchTrades } = useTrades()

onMounted(fetchTrades)

const winRate = computed(() => {
  if (!trades.value.length) return '-'
  const wins = trades.value.filter(t => t.status === 'win').length
  return (wins / trades.value.length * 100).toFixed(1) + '%'
})

const totalPnlVal = computed(() => {
  return trades.value.reduce((s, t) => s + (t.pnl || 0), 0)
})

const recentTrades = computed(() => {
  return trades.value.slice(-10).reverse()
})

function today() {
  return new Date().toLocaleDateString('zh-CN')
}
</script>

<template>
  <header>
    <h1>交易总览</h1>
    <span>{{ today() }}</span>
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
      <h3>总盈亏</h3>
      <p :style="{ color: pnlColor(totalPnlVal) }">{{ pnlText(totalPnlVal) }}</p>
    </div>
    <div class="stat-card">
      <h3>最大回撤</h3>
      <p>-</p>
    </div>
  </div>

  <section>
    <h2 style="margin-bottom:16px">最近交易</h2>
    <table>
      <thead>
        <tr>
          <th>时间</th>
          <th>品种</th>
          <th>方向</th>
          <th>盈亏</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in recentTrades" :key="t.id">
          <td>{{ t.time }}</td>
          <td>{{ t.symbol }}</td>
          <td>{{ t.direction }}</td>
          <td :style="{ color: pnlColor(t.pnl) }">{{ pnlText(t.pnl) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
