import { ref, computed } from 'vue'

export type AppMode = 'normal' | 'standalone'

const currentMode = ref<AppMode>('normal')

export const useAppMode = () => {
  const setMode = (mode: AppMode) => {
    currentMode.value = mode
    localStorage.setItem('appMode', mode)
  }

  const getMode = (): AppMode => {
    const saved = localStorage.getItem('appMode') as AppMode
    return saved || 'normal'
  }

  const initializeMode = () => {
    currentMode.value = getMode()
  }

  const isStandalone = computed(() => currentMode.value === 'standalone')
  const isNormal = computed(() => currentMode.value === 'normal')

  return {
    currentMode: computed(() => currentMode.value),
    setMode,
    getMode,
    initializeMode,
    isStandalone,
    isNormal
  }
}