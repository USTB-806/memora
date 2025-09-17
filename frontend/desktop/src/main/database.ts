import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'

export interface User {
  id?: string
  username: string
  email: string
  password_hash: string
  avatar_attachment_id?: string
  created_at?: string
  updated_at?: string
}

export interface Category {
  id?: string
  user_id: string
  name: string
  emoji?: string
  knowledge_base_id?: string
}

export interface Collection {
  id?: string
  user_id: string
  category_id?: string
  name?: string
  description?: string
  tags?: string
  created_at?: string
  updated_at?: string
}

export interface CollectionDetail {
  id?: string
  collection_id: string
  key: string
  value?: any
  created_at?: string
  updated_at?: string
}

export interface Attachment {
  id?: string
  user_id: string
  url: string
  description?: string
  created_at?: string
}

export interface Post {
  id?: string
  user_id: string
  refer_collection_id: string
  description?: string
  is_private?: boolean
  created_at?: string
  updated_at?: string
}

export interface Comment {
  id?: string
  post_id: string
  user_id: string
  content: string
  created_at?: string
  updated_at?: string
}

export interface Like {
  id?: string
  user_id: string
  asset_id: string
  asset_type: 'post' | 'comment'
  created_at?: string
}

class LocalDatabase {
  private db: Database.Database | null = null
  private dbPath: string | null = null

  constructor() {
    // 延迟初始化数据库路径，确保app已经ready
  }

  private getDbPath(): string {
    if (!this.dbPath) {
      // 使用用户主目录下的应用数据文件夹，确保不需要管理员权限
      const homeDir = require('os').homedir()
      const appDataPath = path.join(homeDir, 'AppData', 'Roaming', 'memora-data')
      this.dbPath = path.join(appDataPath, 'memora-local.db')
      console.log('Local database path:', this.dbPath)

      // 确保目录存在
      const dbDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
        console.log('Created database directory:', dbDir)
      }
    }
    return this.dbPath
  }

  private getDb(): Database.Database {
    if (!this.db) {
      const dbPath = this.getDbPath()

      // 确保目录存在
      const dbDir = path.dirname(dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      this.db = new Database(dbPath)
      this.initializeTables()
    }
    return this.db
  }

  private initializeTables(): void {
    const db = this.db!
    db.pragma('journal_mode = WAL')

    // 创建用户表
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_attachment_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(username),
        UNIQUE(email)
      )
    `)

    // 创建分类表
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        emoji TEXT,
        knowledge_base_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, name)
      )
    `)

    // 创建集合表
    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category_id TEXT,
        name TEXT,
        description TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )
    `)

    // 创建集合详情表
    db.exec(`
      CREATE TABLE IF NOT EXISTS collection_details (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (collection_id) REFERENCES collections (id),
        UNIQUE(collection_id, key)
      )
    `)

    // 创建附件表
    db.exec(`
      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // 创建集合附件关联表
    db.exec(`
      CREATE TABLE IF NOT EXISTS collection_attachments (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        attachment_id TEXT NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections (id),
        FOREIGN KEY (attachment_id) REFERENCES attachments (id),
        UNIQUE(collection_id, attachment_id)
      )
    `)

    // 创建帖子表
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refer_collection_id TEXT NOT NULL,
        description TEXT,
        is_private BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (refer_collection_id) REFERENCES collections (id)
      )
    `)

    // 创建评论表
    db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // 创建点赞表
    db.exec(`
      CREATE TABLE IF NOT EXISTS likes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        asset_type TEXT NOT NULL CHECK (asset_type IN ('post', 'comment')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, asset_id, asset_type)
      )
    `)

    console.log('Database tables initialized')
  }

  // 用户相关操作
  createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const db = this.getDb()
    const id = randomUUID()
    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, avatar_attachment_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(id, user.username, user.email, user.password_hash, user.avatar_attachment_id)
    return { ...user, id }
  }

  getUserById(id: string): User | null {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(id) as User | null
  }

  getUserByUsername(username: string): User | null {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
    return stmt.get(username) as User | null
  }

  getUserByEmail(email: string): User | null {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?')
    return stmt.get(email) as User | null
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): void {
    const db = this.getDb()
    const fields = Object.keys(updates)
    const values = Object.values(updates)
    const setClause = fields.map(field => `${field} = ?`).join(', ')

    const stmt = db.prepare(`UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    stmt.run(...values, id)
  }

  // 分类相关操作
  createCategory(category: Omit<Category, 'id'>): Category {
    const db = this.getDb()
    const id = randomUUID()
    const stmt = db.prepare(`
      INSERT INTO categories (id, user_id, name, emoji, knowledge_base_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(id, category.user_id, category.name, category.emoji, category.knowledge_base_id)
    return { ...category, id }
  }

  getCategoriesByUserId(userId: string): Category[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM categories WHERE user_id = ?')
    return stmt.all(userId) as Category[]
  }

  // 集合相关操作
  createCollection(collection: Omit<Collection, 'id' | 'created_at' | 'updated_at'>): Collection {
    const db = this.getDb()
    const id = randomUUID()
    const stmt = db.prepare(`
      INSERT INTO collections (id, user_id, category_id, name, description, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.run(id, collection.user_id, collection.category_id, collection.name, collection.description, collection.tags)
    return { ...collection, id }
  }

  getCollectionsByUserId(userId: string): Collection[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY created_at DESC')
    return stmt.all(userId) as Collection[]
  }

  getCollectionById(id: string): Collection | null {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM collections WHERE id = ?')
    return stmt.get(id) as Collection | null
  }

  // 集合详情相关操作
  createCollectionDetail(detail: Omit<CollectionDetail, 'id' | 'created_at' | 'updated_at'>): CollectionDetail {
    const db = this.getDb()
    const id = randomUUID()
    const stmt = db.prepare(`
      INSERT INTO collection_details (id, collection_id, key, value)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(id, detail.collection_id, detail.key, JSON.stringify(detail.value))
    return { ...detail, id }
  }

  getCollectionDetails(collectionId: string): CollectionDetail[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM collection_details WHERE collection_id = ?')
    const details = stmt.all(collectionId) as any[]
    return details.map(detail => ({
      ...detail,
      value: detail.value ? JSON.parse(detail.value) : null
    }))
  }

  // 附件相关操作
  createAttachment(attachment: Omit<Attachment, 'id' | 'created_at'>): Attachment {
    const db = this.getDb()
    const id = randomUUID()
    const stmt = db.prepare(`
      INSERT INTO attachments (id, user_id, url, description)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(id, attachment.user_id, attachment.url, attachment.description)
    return { ...attachment, id }
  }

  getAttachmentsByUserId(userId: string): Attachment[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM attachments WHERE user_id = ? ORDER BY created_at DESC')
    return stmt.all(userId) as Attachment[]
  }

  // 帖子相关操作
  createPost(post: Omit<Post, 'id' | 'created_at' | 'updated_at'>): Post {
    const db = this.getDb()
    const id = randomUUID()
    const stmt = db.prepare(`
      INSERT INTO posts (id, user_id, refer_collection_id, description, is_private)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(id, post.user_id, post.refer_collection_id, post.description, post.is_private ? 1 : 0)
    return { ...post, id }
  }

  getPostsByUserId(userId: string): Post[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC')
    return stmt.all(userId) as Post[]
  }

  getPostsByCollectionId(collectionId: string): Post[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM posts WHERE refer_collection_id = ? ORDER BY created_at DESC')
    return stmt.all(collectionId) as Post[]
  }

  // 私有帖子相关操作
  getPrivatePostsByUserId(userId: string): Post[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM posts WHERE user_id = ? AND is_private = 1 ORDER BY created_at DESC')
    return stmt.all(userId) as Post[]
  }

  getPublicPostsByUserId(userId: string): Post[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM posts WHERE user_id = ? AND is_private = 0 ORDER BY created_at DESC')
    return stmt.all(userId) as Post[]
  }

  updatePostPrivacy(postId: string, isPrivate: boolean): boolean {
    const db = this.getDb()
    const stmt = db.prepare('UPDATE posts SET is_private = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    const result = stmt.run(isPrivate ? 1 : 0, postId)
    return result.changes > 0
  }

  // 评论相关操作
  createComment(comment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>): Comment {
    const db = this.getDb()
    const id = randomUUID()
    const stmt = db.prepare(`
      INSERT INTO comments (id, post_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(id, comment.post_id, comment.user_id, comment.content)
    return { ...comment, id }
  }

  getCommentsByPostId(postId: string): Comment[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC')
    return stmt.all(postId) as Comment[]
  }

  // 点赞相关操作
  createLike(like: Omit<Like, 'id' | 'created_at'>): Like {
    const db = this.getDb()
    const id = randomUUID()
    const stmt = db.prepare(`
      INSERT INTO likes (id, user_id, asset_id, asset_type)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(id, like.user_id, like.asset_id, like.asset_type)
    return { ...like, id }
  }

  removeLike(userId: string, assetId: string, assetType: 'post' | 'comment'): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      DELETE FROM likes WHERE user_id = ? AND asset_id = ? AND asset_type = ?
    `)
    stmt.run(userId, assetId, assetType)
  }

  getLikesByAsset(assetId: string, assetType: 'post' | 'comment'): Like[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM likes WHERE asset_id = ? AND asset_type = ?')
    return stmt.all(assetId, assetType) as Like[]
  }

  // 关闭数据库连接
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// 导出单例实例
export const localDb = new LocalDatabase()