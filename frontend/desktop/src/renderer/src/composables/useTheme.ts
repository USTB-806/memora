import { ref, onMounted } from 'vue'

export const useTheme = () => {
  const theme = ref<string>('light')

  const applyTheme = (newTheme: string) => {
    const root = document.documentElement
    const body = document.body
    
    // 移除所有主题类
    root.classList.remove('dark', 'light')
    body.classList.remove('dark', 'light')
    
    if (newTheme === 'dark') {
      root.classList.add('dark')
      body.classList.add('dark')
      // 强制设置样式
      root.style.colorScheme = 'dark'
      body.style.backgroundColor = '#0f1419'
      body.style.color = '#f9fafb'
    } else if (newTheme === 'light') {
      root.classList.add('light')
      body.classList.add('light')
      root.style.colorScheme = 'light'
      body.style.backgroundColor = '#ffffff'
      body.style.color = '#111827'
    } else if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
        body.classList.add('dark')
        root.style.colorScheme = 'dark'
        body.style.backgroundColor = '#0f1419'
        body.style.color = '#f9fafb'
      } else {
        root.classList.add('light')
        body.classList.add('light')
        root.style.colorScheme = 'light'
        body.style.backgroundColor = '#ffffff'
        body.style.color = '#111827'
      }
    }
  }

  const setTheme = (newTheme: string) => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    theme.value = savedTheme
    applyTheme(savedTheme)

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'system') {
        applyTheme('system')
      }
    })
  }

  onMounted(() => {
    initTheme()
  })

  return {
    theme,
    setTheme,
    applyTheme,
    initTheme
  }
}
