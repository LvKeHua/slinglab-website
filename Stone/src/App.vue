<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { path: '/', label: '总览' },
  { path: '/trades', label: '交易记录' },
  { path: '/analytics', label: '分析' },
  { path: '/settings', label: '设置' }
]

function isActive(p) {
  if (p === '/') return route.path === '/'
  return route.path === p
}
</script>

<template>
  <div class="app-layout">
    <nav class="sidebar">
      <div class="logo">Stone Journal</div>
      <ul>
        <li v-for="item in navItems" :key="item.path">
          <router-link :to="item.path" :class="{ active: isActive(item.path) }">
            {{ item.label }}
          </router-link>
        </li>
      </ul>
    </nav>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}
</style>
