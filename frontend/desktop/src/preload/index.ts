import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 定义 API 接口类型
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

// Custom APIs for renderer
const api: CustomAPI = {
  // 主窗口控制
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),

  // 快速窗口控制
  hideQuickWindow: () => ipcRenderer.invoke('hide-quick-window'),

  // 获取 Edge 浏览器链接
  captureEdgeUrl: () => ipcRenderer.invoke('capture-edge-url'),

  // 检测活跃浏览器
  detectActiveBrowser: () => ipcRenderer.invoke('detect-active-browser'),

  // 获取操作系统信息
  getPlatform: () => process.platform,

  // 其他实用功能
  ping: () => ipcRenderer.send('ping')
}

const electronAPIExtended: ElectronAPIExtended = {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on: (channel: string, func: (...args: any[]) => void) =>
    ipcRenderer.on(channel, (_event: IpcRendererEvent, ...args: any[]) => func(...args)),
  getPlatform: () => process.platform
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', electronAPIExtended)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // 当 context isolation 被禁用时，直接添加到 window 对象
  ;(globalThis as any).electron = electronAPI
  ;(globalThis as any).electronAPI = electronAPIExtended
  ;(globalThis as any).api = api
}
