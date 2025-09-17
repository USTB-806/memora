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

declare global {
  interface Window {
    electron: ElectronAPI
    electronAPI: ElectronAPIExtended
    api: CustomAPI
  }
}
