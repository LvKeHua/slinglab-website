<script setup>
import { ref, onMounted } from 'vue'

const toast = ref('')
let toastTimer = null
const defaultSymbol = ref('BTC/USDT')
const defaultLeverage = ref('1x')

onMounted(() => {
  const saved = localStorage.getItem('stone_settings')
  if (saved) {
    try {
      const s = JSON.parse(saved)
      if (s.defaultSymbol) defaultSymbol.value = s.defaultSymbol
      if (s.defaultLeverage) defaultLeverage.value = s.defaultLeverage
    } catch (_) {}
  }
})

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2000)
}

function save() {
  localStorage.setItem('stone_settings', JSON.stringify({
    defaultSymbol: defaultSymbol.value,
    defaultLeverage: defaultLeverage.value
  }))
  showToast('设置已保存')
}
</script>

<template>
  <header>
    <h1>设置</h1>
  </header>

  <section class="settings-card">
    <div class="field">
      <label>默认交易品种</label>
      <input v-model="defaultSymbol">
    </div>
    <div class="field">
      <label>默认杠杆</label>
      <input v-model="defaultLeverage">
    </div>
    <button class="btn" @click="save">保存设置</button>
    <transition name="fade">
      <span v-if="toast" class="toast">{{ toast }}</span>
    </transition>
  </section>
</template>

<style scoped>
.settings-card {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  position: relative;
}
.field {
  margin-bottom: 20px;
}
.field input {
  width: 100%;
}
.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: #4caf50;
  color: #fff;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 999;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
