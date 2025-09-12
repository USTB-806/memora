import { ElectronAPI } from '@electron-toolkit/preload'

// 定义自定义 API 接口
interface CustomAPI {
  // 主窗口控制
  showMainWindow: () => Promise<{ success: boolean; error?: string }>

  // 快速窗口控制
  hideQuickWindow: () => Promise<{ success: boolean; error?: string }>

  // 获取 Edge 浏览器链接
  captureEdgeUrl: () => Promise<{
    success: boolean
    url?: string
    error?: string
  }>

  // 检测活跃浏览器
  detectActiveBrowser: () => Promise<{
    success: boolean
    browser: string
    hasBrowser: boolean
    windowTitle: string
    error?: string
  }>

  // 获取操作系统信息
  getPlatform: () => NodeJS.Platform

  // 其他实用功能
  ping: () => void
}

interface ElectronAPIExtended {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  send: (channel: string, ...args: any[]) => void
  on: (channel: string, func: (...args: any[]) => void) => void
  getPlatform: () => NodeJS.Platform
}

declare global {
  interface Window {
    electron: ElectronAPI
    electronAPI: ElectronAPIExtended
    api: CustomAPI
  }
}
