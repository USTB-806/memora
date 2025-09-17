import { useAppMode } from '@/composables/useAppMode'
import { serverAPI } from '@/services/serverAPI.service'

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
    attachments: number
  }
  errors: string[]
}

export class DataMigrationService {
  private mode = useAppMode()

  // 从后端API导出数据
  async exportFromBackendDatabase(): Promise<any> {
    try {
      console.log('Exporting data from backend API...')

      // 使用统一的ServerAPI服务
      const result = await serverAPI.exportUserData()

      if (result.code !== 200) {
        throw new Error(result.message || 'Failed to export from backend API')
      }

      return result.data
    } catch (error) {
      console.error('Failed to export from backend API:', error)
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
        knowledgeDocuments: 0,
        attachments: 0
      },
      errors: []
    }

    try {
      console.log('Importing data to local database...')

      // 1. 导入用户数据（需要提供password_hash）
      if (data.users && data.users.length > 0) {
        for (const user of data.users) {
          try {
            const userData = {
              ...user,
              password_hash: user.password_hash || '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfLkIwFhhBLxKC' // 默认密码哈希
            }
            await window.api.database.createUser(userData)
            result.migratedItems.users++
          } catch (error) {
            result.errors.push(`Failed to import user ${user.username}: ${error}`)
          }
        }
      }

      // 2. 导入分类数据
      if (data.categories && data.categories.length > 0) {
        for (const category of data.categories) {
          try {
            await window.api.database.createCategory(category)
            // categories 计数可以添加到 migratedItems 中
          } catch (error) {
            result.errors.push(`Failed to import category ${category.name}: ${error}`)
          }
        }
      }

      // 3. 导入集合数据
      if (options.includeCollections && data.collections && data.collections.length > 0) {
        for (const collection of data.collections) {
          try {
            // 确保category_id存在，如果不存在设为null
            const collectionData = {
              ...collection,
              category_id: collection.category_id || null
            }
            await window.api.database.createCollection(collectionData)
            result.migratedItems.collections++
          } catch (error) {
            result.errors.push(`Failed to import collection ${collection.name}: ${error}`)
          }
        }
      }

      // 3.5 导入集合详情数据
      if (options.includeCollections && data.collection_details && data.collection_details.length > 0) {
        for (const detail of data.collection_details) {
          try {
            await window.api.database.createCollectionDetail(detail)
            // collection_details 计数可以添加到 migratedItems 中
          } catch (error) {
            result.errors.push(`Failed to import collection detail ${detail.key}: ${error}`)
          }
        }
      }

      // 4. 导入帖子数据
      if (data.posts && data.posts.length > 0) {
        for (const post of data.posts) {
          // 检查是否包含私有帖子
          if (!options.includePrivatePosts && post.is_private) {
            continue
          }

          try {
            // 确保refer_collection_id存在，如果不存在创建一个默认的collection
            if (!post.collection_id && !post.refer_collection_id) {
              // 为没有collection_id的帖子创建一个默认的collection
              const defaultCollection = {
                user_id: post.user_id,
                name: `Default Collection for Post ${post.post_id}`,
                description: 'Auto-created collection for migrated post',
                category_id: null,
                tags: null,
                created_at: post.created_at,
                updated_at: post.updated_at
              }

              try {
                const collectionResult = await window.api.database.createCollection(defaultCollection)
                if (collectionResult.success && collectionResult.data) {
                  post.collection_id = collectionResult.data.id
                  result.errors.push(`Created default collection for post ${post.post_id}`)
                } else {
                  result.errors.push(`Failed to create default collection for post ${post.post_id}, skipping post`)
                  continue
                }
              } catch (collectionError) {
                result.errors.push(`Failed to create default collection for post ${post.post_id}: ${collectionError}, skipping post`)
                continue
              }
            }

            const postData = {
              ...post,
              refer_collection_id: post.collection_id || post.refer_collection_id, // 后端导出的是collection_id
              description: post.content || post.description || '' // 后端导出的是content
            }
            await window.api.database.createPost(postData)
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

      // 5. 导入附件数据
      if (data.attachments && data.attachments.length > 0) {
        for (const attachment of data.attachments) {
          try {
            // 确保attachment_id存在
            if (!attachment.attachment_id) {
              // 如果没有attachment_id，生成一个
              const attachmentData = {
                ...attachment,
                attachment_id: `attachment_${attachment.id}_${Date.now()}`
              }
              await window.api.database.createAttachment(attachmentData)
            } else {
              await window.api.database.createAttachment(attachment)
            }
            result.migratedItems.attachments++
          } catch (error) {
            result.errors.push(`Failed to import attachment ${attachment.filename}: ${error}`)
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
        knowledgeDocuments: 0,
        attachments: 0
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
        // 从后端数据库迁移到本地
        const backendData = await this.exportFromBackendDatabase()
        return await this.importToLocal(backendData, options)
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
          knowledgeDocuments: 0,
          attachments: 0
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