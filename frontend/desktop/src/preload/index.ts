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

  // 本地数据库 API
  database: {
    // 用户相关
    createUser: (user: any) => Promise<{ success: boolean; data?: any; error?: string }>
    getUserById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>
    getUserByUsername: (username: string) => Promise<{ success: boolean; data?: any; error?: string }>
    getUserByEmail: (email: string) => Promise<{ success: boolean; data?: any; error?: string }>
    updateUser: (id: number, updates: any) => Promise<{ success: boolean; error?: string }>

    // 分类相关
    createCategory: (category: any) => Promise<{ success: boolean; data?: any; error?: string }>
    getCategoriesByUserId: (userId: number) => Promise<{ success: boolean; data?: any; error?: string }>

    // 集合相关
    createCollection: (collection: any) => Promise<{ success: boolean; data?: any; error?: string }>
    getCollectionsByUserId: (userId: number) => Promise<{ success: boolean; data?: any; error?: string }>
    getCollectionById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>

    // 集合详情相关
    createCollectionDetail: (detail: any) => Promise<{ success: boolean; data?: any; error?: string }>
    getCollectionDetails: (collectionId: number) => Promise<{ success: boolean; data?: any; error?: string }>

    // 附件相关
    createAttachment: (attachment: any) => Promise<{ success: boolean; data?: any; error?: string }>
    getAttachmentsByUserId: (userId: number) => Promise<{ success: boolean; data?: any; error?: string }>

    // 帖子相关
    createPost: (post: any) => Promise<{ success: boolean; data?: any; error?: string }>
    getPostsByUserId: (userId: number) => Promise<{ success: boolean; data?: any; error?: string }>
    getPostsByCollectionId: (collectionId: number) => Promise<{ success: boolean; data?: any; error?: string }>

    // 私有帖子相关
    getPrivatePostsByUserId: (userId: number) => Promise<{ success: boolean; data?: any; error?: string }>
    getPublicPostsByUserId: (userId: number) => Promise<{ success: boolean; data?: any; error?: string }>
    updatePostPrivacy: (postId: string, isPrivate: boolean) => Promise<{ success: boolean; data?: boolean; error?: string }>

    // 评论相关
    createComment: (comment: any) => Promise<{ success: boolean; data?: any; error?: string }>
    getCommentsByPostId: (postId: number) => Promise<{ success: boolean; data?: any; error?: string }>

    // 点赞相关
    createLike: (like: any) => Promise<{ success: boolean; data?: any; error?: string }>
    removeLike: (userId: number, assetId: number, assetType: string) => Promise<{ success: boolean; error?: string }>
    getLikesByAsset: (assetId: number, assetType: string) => Promise<{ success: boolean; data?: any; error?: string }>
  }

  // AI 服务 API
  ai: {
    configure: (config: any) => Promise<{ success: boolean; error?: string }>
    chat: (messages: any[], options?: any) => Promise<{ success: boolean; content?: string; error?: string }>
    summarize: (content: string) => Promise<{ success: boolean; content?: string; error?: string }>
    categorize: (content: string, categories: string[]) => Promise<{ success: boolean; content?: string; error?: string }>
    queryKnowledge: (query: string, documents: string[]) => Promise<{ success: boolean; content?: string; error?: string }>
    isConfigured: () => Promise<boolean>
    getConfig: () => Promise<any>
  }

  // 本地知识库 API
  knowledgeBase: {
    addDocument: (document: any, collectionId?: string) => Promise<{ success: boolean; data?: string; error?: string }>
    removeDocument: (documentId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    searchDocuments: (query: string, limit?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>
    getDocument: (documentId: string) => Promise<{ success: boolean; data?: any; error?: string }>
    getAllDocuments: (limit?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>
    createCollection: (id: string, name: string, description?: string) => Promise<{ success: boolean; error?: string }>
    removeCollection: (collectionId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    addDocumentToCollection: (documentId: string, collectionId: string) => Promise<{ success: boolean; error?: string }>
    removeDocumentFromCollection: (documentId: string, collectionId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    getCollectionDocuments: (collectionId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    getCollections: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  }

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

  // 本地数据库 API
  database: {
    // 用户相关
    createUser: (user) => ipcRenderer.invoke('db-create-user', user),
    getUserById: (id) => ipcRenderer.invoke('db-get-user-by-id', id),
    getUserByUsername: (username) => ipcRenderer.invoke('db-get-user-by-username', username),
    getUserByEmail: (email) => ipcRenderer.invoke('db-get-user-by-email', email),
    updateUser: (id, updates) => ipcRenderer.invoke('db-update-user', id, updates),

    // 分类相关
    createCategory: (category) => ipcRenderer.invoke('db-create-category', category),
    getCategoriesByUserId: (userId) => ipcRenderer.invoke('db-get-categories-by-user-id', userId),

    // 集合相关
    createCollection: (collection) => ipcRenderer.invoke('db-create-collection', collection),
    getCollectionsByUserId: (userId) => ipcRenderer.invoke('db-get-collections-by-user-id', userId),
    getCollectionById: (id) => ipcRenderer.invoke('db-get-collection-by-id', id),

    // 集合详情相关
    createCollectionDetail: (detail) => ipcRenderer.invoke('db-create-collection-detail', detail),
    getCollectionDetails: (collectionId) => ipcRenderer.invoke('db-get-collection-details', collectionId),

    // 附件相关
    createAttachment: (attachment) => ipcRenderer.invoke('db-create-attachment', attachment),
    getAttachmentsByUserId: (userId) => ipcRenderer.invoke('db-get-attachments-by-user-id', userId),

    // 帖子相关
    createPost: (post) => ipcRenderer.invoke('db-create-post', post),
    getPostsByUserId: (userId) => ipcRenderer.invoke('db-get-posts-by-user-id', userId),
    getPostsByCollectionId: (collectionId) => ipcRenderer.invoke('db-get-posts-by-collection-id', collectionId),

    // 私有帖子相关
    getPrivatePostsByUserId: (userId) => ipcRenderer.invoke('db-get-private-posts-by-user-id', userId),
    getPublicPostsByUserId: (userId) => ipcRenderer.invoke('db-get-public-posts-by-user-id', userId),
    updatePostPrivacy: (postId, isPrivate) => ipcRenderer.invoke('db-update-post-privacy', postId, isPrivate),

    // 评论相关
    createComment: (comment) => ipcRenderer.invoke('db-create-comment', comment),
    getCommentsByPostId: (postId) => ipcRenderer.invoke('db-get-comments-by-post-id', postId),

    // 点赞相关
    createLike: (like) => ipcRenderer.invoke('db-create-like', like),
    removeLike: (userId, assetId, assetType) => ipcRenderer.invoke('db-remove-like', userId, assetId, assetType),
    getLikesByAsset: (assetId, assetType) => ipcRenderer.invoke('db-get-likes-by-asset', assetId, assetType)
  },

  // AI 服务 API
  ai: {
    configure: (config) => ipcRenderer.invoke('ai-configure', config),
    chat: (messages, options) => ipcRenderer.invoke('ai-chat', messages, options),
    summarize: (content) => ipcRenderer.invoke('ai-summarize', content),
    categorize: (content, categories) => ipcRenderer.invoke('ai-categorize', content, categories),
    queryKnowledge: (query, documents) => ipcRenderer.invoke('ai-query-knowledge', query, documents),
    isConfigured: () => ipcRenderer.invoke('ai-is-configured'),
    getConfig: () => ipcRenderer.invoke('ai-get-config')
  },

  // 本地知识库 API
  knowledgeBase: {
    addDocument: (document, collectionId) => ipcRenderer.invoke('kb-add-document', document, collectionId),
    removeDocument: (documentId) => ipcRenderer.invoke('kb-remove-document', documentId),
    searchDocuments: (query, limit) => ipcRenderer.invoke('kb-search-documents', query, limit),
    getDocument: (documentId) => ipcRenderer.invoke('kb-get-document', documentId),
    getAllDocuments: (limit) => ipcRenderer.invoke('kb-get-all-documents', limit),
    createCollection: (id, name, description) => ipcRenderer.invoke('kb-create-collection', id, name, description),
    removeCollection: (collectionId) => ipcRenderer.invoke('kb-remove-collection', collectionId),
    addDocumentToCollection: (documentId, collectionId) => ipcRenderer.invoke('kb-add-document-to-collection', documentId, collectionId),
    removeDocumentFromCollection: (documentId, collectionId) => ipcRenderer.invoke('kb-remove-document-from-collection', documentId, collectionId),
    getCollectionDocuments: (collectionId) => ipcRenderer.invoke('kb-get-collection-documents', collectionId),
    getCollections: () => ipcRenderer.invoke('kb-get-collections')
  },

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

// Use contextBridge APIs to expose Electron APIs to
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
