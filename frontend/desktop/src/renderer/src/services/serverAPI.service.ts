import { ApiResponse } from '@/types'

// 服务器API服务 - 用于从远程服务器获取数据
export class ServerAPIService {
  private baseURL = 'http://localhost:8000/api/v1' // 服务器基础URL
  private token: string | null = null

  // 设置认证token
  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('access_token', token) // 使用与profile页面相同的token名称
    } else {
      localStorage.removeItem('access_token')
    }
  }

  // 获取认证token
  getToken(): string | null {
    return this.token
  }

  // 从本地存储加载token
  loadTokenFromStorage() {
    const storedToken = localStorage.getItem('access_token') // 使用与profile页面相同的token名称
    if (storedToken) {
      this.token = storedToken
      return true
    }
    return false
  }

  // 检查是否已认证
  isAuthenticated(): boolean {
    return this.token !== null
  }

  // 初始化认证状态
  async initializeAuth(): Promise<boolean> {
    // 首先尝试从本地存储加载token
    if (this.loadTokenFromStorage()) {
      // 验证token是否仍然有效
      const userResult = await this.getCurrentUser()
      if (userResult.code === 200) {
        return true
      } else {
        // token无效，清除它
        this.setToken(null)
      }
    }
    return false
  }

  // 获取认证头
  private getAuthHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    return headers
  }

  // 用户认证相关
  async login(username: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()
      if (response.ok && data.code === 200) {
        this.setToken(data.data.access_token)
      }

      return data
    } catch (error) {
      console.error('Login failed:', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Login failed',
        data: null
      }
    }
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/auth/profile`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      return await response.json()
    } catch (error) {
      console.error('Get current user failed:', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Get current user failed',
        data: null
      }
    }
  }

  // 获取用户的所有集合
  async getUserCollections(userId: number): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/collection/user/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      return await response.json()
    } catch (error) {
      console.error('Get user collections failed:', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Get user collections failed',
        data: null
      }
    }
  }

  // 获取集合详情
  async getCollectionDetails(collectionId: number): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/collection/${collectionId}/details`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      return await response.json()
    } catch (error) {
      console.error('Get collection details failed:', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Get collection details failed',
        data: null
      }
    }
  }

  // 获取用户的所有帖子
  async getUserPosts(userId: number): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/community/posts/user/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      return await response.json()
    } catch (error) {
      console.error('Get user posts failed:', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Get user posts failed',
        data: null
      }
    }
  }

  // 获取帖子的评论
  async getPostComments(postId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/community/comments/post/${postId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      return await response.json()
    } catch (error) {
      console.error('Get post comments failed:', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Get post comments failed',
        data: null
      }
    }
  }

  // 获取用户的所有分类
  async getUserCategories(userId: number): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/category/user/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      return await response.json()
    } catch (error) {
      console.error('Get user categories failed:', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Get user categories failed',
        data: null
      }
    }
  }

  // 获取知识库文档
  async getKnowledgeDocuments(userId: number): Promise<ApiResponse> {
    try {
      // 注意：这个API可能需要根据实际的后端实现调整
      const response = await fetch(`${this.baseURL}/knowledge/user/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      return await response.json()
    } catch (error) {
      console.error('Get knowledge documents failed:', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Get knowledge documents failed',
        data: null
      }
    }
  }

  // 获取用户的所有附件
  async getUserAttachments(userId: number): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/attachment/user/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      return await response.json()
    } catch (error) {
      console.error('Get user attachments failed:', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Get user attachments failed',
        data: null
      }
    }
  }

  // 批量获取所有用户数据
  async getAllUserData(userId: number): Promise<{
    success: boolean
    data?: {
      user: any
      collections: any[]
      posts: any[]
      comments: any[]
      categories: any[]
      knowledgeDocuments: any[]
      attachments: any[]
    }
    error?: string
  }> {
    try {
      console.log('Fetching all user data from server...')

      // 并行获取所有数据
      const [
        userResult,
        collectionsResult,
        postsResult,
        categoriesResult,
        knowledgeResult,
        attachmentsResult
      ] = await Promise.all([
        this.getCurrentUser(),
        this.getUserCollections(userId),
        this.getUserPosts(userId),
        this.getUserCategories(userId),
        this.getKnowledgeDocuments(userId),
        this.getUserAttachments(userId)
      ])

      // 获取所有帖子的评论
      let allComments: any[] = []
      if (postsResult.code === 200 && postsResult.data) {
        const commentPromises = postsResult.data.map((post: any) =>
          this.getPostComments(post.post_id)
        )
        const commentResults = await Promise.all(commentPromises)

        allComments = commentResults
          .filter(result => result.code === 200)
          .flatMap(result => result.data || [])
      }

      return {
        success: true,
        data: {
          user: userResult.code === 200 ? userResult.data : null,
          collections: collectionsResult.code === 200 ? collectionsResult.data || [] : [],
          posts: postsResult.code === 200 ? postsResult.data || [] : [],
          comments: allComments,
          categories: categoriesResult.code === 200 ? categoriesResult.data || [] : [],
          knowledgeDocuments: knowledgeResult.code === 200 ? knowledgeResult.data || [] : [],
          attachments: attachmentsResult.code === 200 ? attachmentsResult.data || [] : []
        }
      }
    } catch (error) {
      console.error('Get all user data failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get all user data failed'
      }
    }
  }

  // 迁移相关API
  async exportUserData(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/migration/export`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      const result = await response.json()

      if (result.code !== 200) {
        return {
          code: result.code || 500,
          message: result.message || 'Export data failed',
          data: null
        }
      }

      return {
        code: 200,
        message: 'Export successful',
        data: result.data
      }
    } catch (error) {
      console.error('Export user data failed:', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Export user data failed',
        data: null
      }
    }
  }
}

// 导出单例实例
export const serverAPI = new ServerAPIService()