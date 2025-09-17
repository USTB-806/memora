import { useAppMode } from '@/composables/useAppMode'

export interface MigrationOptions {
  direction: 'to-standalone' | 'to-normal'
  includePrivatePosts?: boolean
  includeCollections?: boolean
  includeKnowledgeBase?: boolean
}

export interface MigrationResult {
  success: boolean
  migratedItems: {
    users: number
    collections: number
    posts: number
    comments: number
    knowledgeDocuments: number
  }
  errors: string[]
}

export class DataMigrationService {
  private mode = useAppMode()

  // 从服务器导出数据
  async exportFromServer(): Promise<any> {
    try {
      // 这里应该调用服务器API来导出用户数据
      // 由于我们没有实际的服务器API，这里返回模拟数据
      console.log('Exporting data from server...')

      const mockData = {
        users: [],
        collections: [],
        posts: [],
        comments: [],
        knowledgeDocuments: []
      }

      return mockData
    } catch (error) {
      console.error('Failed to export from server:', error)
      throw error
    }
  }

  // 导入数据到本地数据库
  async importToLocal(data: any, options: MigrationOptions): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: {
        users: 0,
        collections: 0,
        posts: 0,
        comments: 0,
        knowledgeDocuments: 0
      },
      errors: []
    }

    try {
      console.log('Importing data to local database...')

      // 导入用户数据
      if (data.users && data.users.length > 0) {
        for (const user of data.users) {
          try {
            await window.api.database.createUser(user)
            result.migratedItems.users++
          } catch (error) {
            result.errors.push(`Failed to import user ${user.username}: ${error}`)
          }
        }
      }

      // 导入集合数据
      if (options.includeCollections && data.collections && data.collections.length > 0) {
        for (const collection of data.collections) {
          try {
            await window.api.database.createCollection(collection)
            result.migratedItems.collections++
          } catch (error) {
            result.errors.push(`Failed to import collection ${collection.name}: ${error}`)
          }
        }
      }

      // 导入帖子数据
      if (data.posts && data.posts.length > 0) {
        for (const post of data.posts) {
          // 检查是否包含私有帖子
          if (!options.includePrivatePosts && post.is_private) {
            continue
          }

          try {
            await window.api.database.createPost(post)
            result.migratedItems.posts++
          } catch (error) {
            result.errors.push(`Failed to import post ${post.post_id}: ${error}`)
          }
        }
      }

      // 导入评论数据
      if (data.comments && data.comments.length > 0) {
        for (const comment of data.comments) {
          try {
            await window.api.database.createComment(comment)
            result.migratedItems.comments++
          } catch (error) {
            result.errors.push(`Failed to import comment: ${error}`)
          }
        }
      }

      // 导入知识库文档
      if (options.includeKnowledgeBase && data.knowledgeDocuments && data.knowledgeDocuments.length > 0) {
        for (const doc of data.knowledgeDocuments) {
          try {
            await window.api.knowledgeBase.addDocument(doc)
            result.migratedItems.knowledgeDocuments++
          } catch (error) {
            result.errors.push(`Failed to import knowledge document ${doc.id}: ${error}`)
          }
        }
      }

      console.log('Data import completed:', result)
      return result
    } catch (error) {
      result.success = false
      result.errors.push(`Migration failed: ${error}`)
      console.error('Migration failed:', error)
      return result
    }
  }

  // 从本地数据库导出数据
  async exportFromLocal(): Promise<any> {
    try {
      console.log('Exporting data from local database...')

      // 获取当前用户信息（这里假设用户ID为1，实际应用中应该从认证系统获取）
      const userId = 1

      const [collections, posts, comments] = await Promise.all([
        window.api.database.getCollectionsByUserId(userId),
        window.api.database.getPostsByUserId(userId),
        // 注意：这里需要一个获取所有评论的方法，暂时使用空数组
        Promise.resolve([])
      ])

      const knowledgeDocuments = await window.api.knowledgeBase.getAllDocuments()

      const data = {
        collections: collections.success ? collections.data : [],
        posts: posts.success ? posts.data : [],
        comments: comments,
        knowledgeDocuments: knowledgeDocuments.success ? knowledgeDocuments.data : []
      }

      return data
    } catch (error) {
      console.error('Failed to export from local:', error)
      throw error
    }
  }

  // 导入数据到服务器
  async importToServer(data: any, options: MigrationOptions): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: {
        users: 0,
        collections: 0,
        posts: 0,
        comments: 0,
        knowledgeDocuments: 0
      },
      errors: []
    }

    try {
      console.log('Importing data to server...')

      // 这里应该调用服务器API来导入数据
      // 由于我们没有实际的服务器API，这里只是模拟

      // 导入集合数据
      if (options.includeCollections && data.collections && data.collections.length > 0) {
        for (const collection of data.collections) {
          try {
            // 模拟服务器API调用
            console.log('Would import collection:', collection.name)
            result.migratedItems.collections++
          } catch (error) {
            result.errors.push(`Failed to import collection ${collection.name}: ${error}`)
          }
        }
      }

      // 导入帖子数据
      if (data.posts && data.posts.length > 0) {
        for (const post of data.posts) {
          // 检查是否包含私有帖子
          if (!options.includePrivatePosts && post.is_private) {
            continue
          }

          try {
            // 模拟服务器API调用
            console.log('Would import post:', post.post_id)
            result.migratedItems.posts++
          } catch (error) {
            result.errors.push(`Failed to import post ${post.post_id}: ${error}`)
          }
        }
      }

      console.log('Data import to server completed:', result)
      return result
    } catch (error) {
      result.success = false
      result.errors.push(`Migration to server failed: ${error}`)
      console.error('Migration to server failed:', error)
      return result
    }
  }

  // 执行完整的数据迁移
  async migrate(options: MigrationOptions): Promise<MigrationResult> {
    try {
      if (options.direction === 'to-standalone') {
        // 从服务器迁移到本地
        const serverData = await this.exportFromServer()
        return await this.importToLocal(serverData, options)
      } else {
        // 从本地迁移到服务器
        const localData = await this.exportFromLocal()
        return await this.importToServer(localData, options)
      }
    } catch (error) {
      console.error('Migration failed:', error)
      return {
        success: false,
        migratedItems: {
          users: 0,
          collections: 0,
          posts: 0,
          comments: 0,
          knowledgeDocuments: 0
        },
        errors: [`Migration failed: ${error}`]
      }
    }
  }

  // 检查迁移状态
  async checkMigrationStatus(): Promise<{
    canMigrateToStandalone: boolean
    canMigrateToNormal: boolean
    lastMigration?: Date
    dataSize: {
      localCollections: number
      localPosts: number
      localKnowledgeDocs: number
    }
  }> {
    try {
      const userId = 1 // 实际应用中应该从认证系统获取

      const [collections, posts, knowledgeDocs] = await Promise.all([
        window.api.database.getCollectionsByUserId(userId),
        window.api.database.getPostsByUserId(userId),
        window.api.knowledgeBase.getAllDocuments()
      ])

      const localCollections = collections.success ? collections.data.length : 0
      const localPosts = posts.success ? posts.data.length : 0
      const localKnowledgeDocs = knowledgeDocs.success && knowledgeDocs.data ? knowledgeDocs.data.length : 0

      // 检查是否可以迁移到standalone模式
      const canMigrateToStandalone = this.mode.currentMode.value === 'normal'

      // 检查是否可以迁移到正常模式（需要服务器连接）
      const canMigrateToNormal = this.mode.currentMode.value === 'standalone'

      return {
        canMigrateToStandalone,
        canMigrateToNormal,
        dataSize: {
          localCollections,
          localPosts,
          localKnowledgeDocs
        }
      }
    } catch (error) {
      console.error('Failed to check migration status:', error)
      return {
        canMigrateToStandalone: false,
        canMigrateToNormal: false,
        dataSize: {
          localCollections: 0,
          localPosts: 0,
          localKnowledgeDocs: 0
        }
      }
    }
  }
}

// 导出单例实例
export const dataMigration = new DataMigrationService()