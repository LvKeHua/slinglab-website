export function pnlColor(v) {
  return (v || 0) >= 0 ? '#4caf50' : '#f44336'
}

export function pnlText(v) {
  const val = v || 0
  return (val >= 0 ? '+' : '') + val.toFixed(2)
}

export function today() {
  return new Date().toLocaleDateString('zh-CN')
}
