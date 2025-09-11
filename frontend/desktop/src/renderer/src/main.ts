import './assets/styles.css'
import { createApp } from 'vue'
import App from './App.vue'
import QuickApp from './components/QuickWindow.vue'
import router from './router'
import i18n from './i18n'

// 强制主题初始化函数
const forceInitTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  const root = document.documentElement
  const body = document.body

  // 清除所有主题类
  root.classList.remove('dark', 'light')
  body.classList.remove('dark', 'light')

  if (savedTheme === 'dark') {
    root.classList.add('dark')
    body.classList.add('dark')
    root.style.colorScheme = 'dark'
    body.style.backgroundColor = '#0f1419'
    body.style.color = '#f9fafb'
    console.log('应用深色主题')
  } else if (savedTheme === 'light') {
    root.classList.add('light')
    body.classList.add('light')
    root.style.colorScheme = 'light'
    body.style.backgroundColor = '#ffffff'
    body.style.color = '#111827'
    console.log('应用浅色主题')
  } else if (savedTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      root.classList.add('dark')
      body.classList.add('dark')
      root.style.colorScheme = 'dark'
      body.style.backgroundColor = '#0f1419'
      body.style.color = '#f9fafb'
      console.log('应用系统深色主题')
    } else {
      root.classList.add('light')
      body.classList.add('light')
      root.style.colorScheme = 'light'
      body.style.backgroundColor = '#ffffff'
      body.style.color = '#111827'
      console.log('应用系统浅色主题')
    }

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (localStorage.getItem('theme') === 'system') {
        forceInitTheme()
      }
    })
  }
}

// 立即初始化主题
forceInitTheme()

// 根据URL hash决定加载哪个应用组件
const isQuickMode = window.location.hash === '#/quick'

if (isQuickMode) {
  // 快速模式，不使用router
  createApp(QuickApp).use(i18n).mount('#app')
} else {
  // 普通模式，使用router
  const app = createApp(App)
  app.use(router)
  app.use(i18n)
  app.mount('#app')
}
