import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import TradesView from '../views/TradesView.vue'
import AnalyticsView from '../views/AnalyticsView.vue'
import SettingsView from '../views/SettingsView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const routes = [
  { path: '/', name: 'dashboard', component: DashboardView, meta: { title: '总览' } },
  { path: '/trades', name: 'trades', component: TradesView, meta: { title: '交易记录' } },
  { path: '/analytics', name: 'analytics', component: AnalyticsView, meta: { title: '分析' } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { title: '设置' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
]

const router = createRouter({
  history: createWebHistory('/stone/'),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
