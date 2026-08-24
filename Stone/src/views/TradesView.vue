<script setup>
import { computed } from 'vue'
import { useTrades } from '../composables/useTrades.js'

const { trades, pnlColor, pnlText, fetchTrades, deleteTrade } = useTrades()

fetchTrades()

const sortedTrades = computed(() => {
  return [...trades.value].reverse()
})
</script>

<template>
  <header>
    <h1>交易记录</h1>
    <button class="btn" disabled title="功能开发中">+ 新增交易</button>
  </header>

  <table>
    <thead>
      <tr>
        <th>时间</th>
        <th>品种</th>
        <th>方向</th>
        <th>入场价</th>
        <th>出场价</th>
        <th>数量</th>
        <th>盈亏</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="t in sortedTrades" :key="t.id">
        <td>{{ t.time }}</td>
        <td>{{ t.symbol }}</td>
        <td>{{ t.direction }}</td>
        <td>{{ t.entry ?? '-' }}</td>
        <td>{{ t.exit ?? '-' }}</td>
        <td>{{ t.size ?? '-' }}</td>
        <td :style="{ color: pnlColor(t.pnl) }">{{ pnlText(t.pnl) }}</td>
        <td>
          <button class="btn-danger" @click="deleteTrade(t.id)">删除</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
