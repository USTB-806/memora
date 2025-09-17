import { useAppMode } from '@/composables/useAppMode'
import type { ApiResponse } from '@/types'

// 统一的API服务，根据应用模式选择不同的后端
class UnifiedAPIService {
  private mode = useAppMode()

  // 帖子相关API
  async createPost(referCollectionId: number, description: string, isPrivate: boolean = false) {
    if (this.mode.isStandalone.value) {
      // 使用本地数据库
      const postId = crypto.randomUUID()
      const post = {
        post_id: postId,
        user_id: 1, // TODO: 从当前用户获取
        refer_collection_id: referCollectionId,
        description,
        is_private: isPrivate
      }

      const result = await window.api.database.createPost(post)
      if (result.success) {
        return { data: result.data }
      } else {
        throw new Error(result.error || 'Failed to create post')
      }
    } else {
      // 使用服务器API
      const response = await fetch('/api/v1/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refer_collection_id: referCollectionId,
          description
        })
      })
      return await response.json()
    }
  }

  async getPostsByUser(userId: number) {
    if (this.mode.isStandalone.value) {
      // 使用本地数据库
      const result = await window.api.database.getPostsByUserId(userId)
      if (result.success) {
        return { data: result.data }
      } else {
        throw new Error(result.error || 'Failed to get posts')
      }
    } else {
      // 使用服务器API
      const response = await fetch(`/api/v1/community/posts/user/${userId}`)
      return await response.json()
    }
  }

  async getPrivatePostsByUser(userId: number) {
    if (this.mode.isStandalone.value) {
      // 使用本地数据库
      const result = await window.api.database.getPrivatePostsByUserId(userId)
      if (result.success) {
        return { data: result.data }
      } else {
        throw new Error(result.error || 'Failed to get private posts')
      }
    } else {
      // 服务器模式下，私有帖子可能不支持或需要特殊处理
      return { data: [] }
    }
  }

  async getPublicPostsByUser(userId: number) {
    if (this.mode.isStandalone.value) {
      // 使用本地数据库
      const result = await window.api.database.getPublicPostsByUserId(userId)
      if (result.success) {
        return { data: result.data }
      } else {
        throw new Error(result.error || 'Failed to get public posts')
      }
    } else {
      // 使用服务器API
      const response = await fetch(`/api/v1/community/posts/user/${userId}/public`)
      return await response.json()
    }
  }

  async updatePostPrivacy(postId: string, isPrivate: boolean) {
    if (this.mode.isStandalone.value) {
      // 使用本地数据库
      const result = await window.api.database.updatePostPrivacy(postId, isPrivate)
      if (result.success) {
        return { data: result.data }
      } else {
        throw new Error(result.error || 'Failed to update post privacy')
      }
    } else {
      // 服务器模式下可能不支持
      throw new Error('Post privacy update not supported in server mode')
    }
  }

  // 评论相关API
  async createComment(postId: number, content: string) {
    if (this.mode.isStandalone.value) {
      // 使用本地数据库
      const comment = {
        post_id: postId,
        user_id: 1, // TODO: 从当前用户获取
        content
      }

      const result = await window.api.database.createComment(comment)
      if (result.success) {
        return { data: result.data }
      } else {
        throw new Error(result.error || 'Failed to create comment')
      }
    } else {
      // 使用服务器API
      const response = await fetch(`/api/v1/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })
      return await response.json()
    }
  }

  async getCommentsByPost(postId: number) {
    if (this.mode.isStandalone.value) {
      // 使用本地数据库
      const result = await window.api.database.getCommentsByPostId(postId)
      if (result.success) {
        return { data: result.data }
      } else {
        throw new Error(result.error || 'Failed to get comments')
      }
    } else {
      // 使用服务器API
      const response = await fetch(`/api/v1/community/posts/${postId}/comments`)
      return await response.json()
    }
  }

  // 集合相关API
  async getCollectionsByUser(userId: number) {
    if (this.mode.isStandalone.value) {
      // 使用本地数据库
      const result = await window.api.database.getCollectionsByUserId(userId)
      if (result.success) {
        return { data: result.data }
      } else {
        throw new Error(result.error || 'Failed to get collections')
      }
    } else {
      // 使用服务器API
      const response = await fetch(`/api/v1/collections/user/${userId}`)
      return await response.json()
    }
  }

  async createCollection(collection: any) {
    if (this.mode.isStandalone.value) {
      // 使用本地数据库
      const result = await window.api.database.createCollection(collection)
      if (result.success) {
        return { data: result.data }
      } else {
        throw new Error(result.error || 'Failed to create collection')
      }
    } else {
      // 使用服务器API
      const response = await fetch('/api/v1/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(collection)
      })
      return await response.json()
    }
  }

  // AI相关API
  async summarizeContent(content: string) {
    if (this.mode.isStandalone.value) {
      // 使用本地AI服务
      const result = await window.api.ai.summarize(content)
      if (result.success) {
        return { data: { summary: result.content } }
      } else {
        throw new Error(result.error || 'Failed to summarize content')
      }
    } else {
      // 使用服务器API
      const response = await fetch('/api/v1/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })
      return await response.json()
    }
  }

  async categorizeContent(content: string, categories: string[]) {
    if (this.mode.isStandalone.value) {
      // 使用本地AI服务
      const result = await window.api.ai.categorize(content, categories)
      if (result.success) {
        return { data: { category: result.content } }
      } else {
        throw new Error(result.error || 'Failed to categorize content')
      }
    } else {
      // 使用服务器API
      const response = await fetch('/api/v1/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, categories })
      })
      return await response.json()
    }
  }

  async chatWithAI(messages: any[], options?: any) {
    if (this.mode.isStandalone.value) {
      // 使用本地AI服务
      const result = await window.api.ai.chat(messages, options)
      if (result.success) {
        return { data: { response: result.content } }
      } else {
        throw new Error(result.error || 'Failed to chat with AI')
      }
    } else {
      // 使用服务器API
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages, options })
      })
      return await response.json()
    }
  }

  // 知识库相关API
  async addDocumentToKnowledgeBase(document: any, collectionId?: string) {
    if (this.mode.isStandalone.value) {
      // 使用本地知识库
      const result = await window.api.knowledgeBase.addDocument(document, collectionId)
      if (result.success) {
        return { data: { id: result.data } }
      } else {
        throw new Error(result.error || 'Failed to add document to knowledge base')
      }
    } else {
      // 使用服务器API
      const response = await fetch('/api/v1/knowledge/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ document, collection_id: collectionId })
      })
      return await response.json()
    }
  }

  async searchKnowledgeBase(query: string, limit?: number) {
    if (this.mode.isStandalone.value) {
      // 使用本地知识库
      const result = await window.api.knowledgeBase.searchDocuments(query, limit)
      if (result.success) {
        return { data: result.data }
      } else {
        throw new Error(result.error || 'Failed to search knowledge base')
      }
    } else {
      // 使用服务器API
      const response = await fetch('/api/v1/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, limit })
      })
      return await response.json()
    }
  }
}

// 导出单例实例
export const unifiedAPI = new UnifiedAPIService()