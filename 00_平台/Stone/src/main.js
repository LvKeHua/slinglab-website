import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles.css'

router.afterEach((to) => {
  document.title = to.meta?.title ? `Stone Journal - ${to.meta.title}` : 'Stone Journal'
})

createApp(App).use(router).mount('#app')
