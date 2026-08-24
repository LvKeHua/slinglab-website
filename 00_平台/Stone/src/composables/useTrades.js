import { ref } from 'vue'

const API_BASE = '/stone/api'

const DEMO_TRADES = [
  { id: 1, time: '2026-07-22 09:30', symbol: 'BTC/USDT', direction: '做多', entry: 65420, exit: 67200, size: 0.5, pnl: 890, status: 'win' },
  { id: 2, time: '2026-07-22 10:15', symbol: 'ETH/USDT', direction: '做空', entry: 3480, exit: 3350, size: 2, pnl: 260, status: 'win' },
  { id: 3, time: '2026-07-21 14:00', symbol: 'SOL/USDT', direction: '做多', entry: 145, exit: 138, size: 10, pnl: -70, status: 'loss' }
]

const trades = ref([])

let nextId = DEMO_TRADES.length + 1

function pnlColor(v) {
  return (v || 0) >= 0 ? '#4caf50' : '#f44336'
}

function pnlText(v) {
  const val = v || 0
  return (val >= 0 ? '+' : '') + val.toFixed(2)
}

async function fetchTrades() {
  try {
    const res = await fetch(`${API_BASE}/trades`)
    if (res.ok) {
      trades.value = await res.json()
      return
    }
  } catch (_) {
    console.log('API not available, using demo data')
  }
  if (!trades.value.length) {
    trades.value = DEMO_TRADES.map(t => ({ ...t }))
  }
}

async function deleteTrade(id) {
  try {
    await fetch(`${API_BASE}/trades/${id}`, { method: 'DELETE' })
    trades.value = trades.value.filter(t => t.id !== id)
  } catch (_) {
    throw new Error('删除失败')
  }
}

function addTrade(trade) {
  trade.id = nextId++
  trades.value = [...trades.value, trade]
}

export function useTrades() {
  return {
    API_BASE,
    trades,
    pnlColor,
    pnlText,
    fetchTrades,
    deleteTrade,
    addTrade
  }
}
