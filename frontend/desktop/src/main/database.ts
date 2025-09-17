import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export interface User {
  id?: number
  username: string
  email: string
  password_hash: string
  avatar_attachment_id?: string
  created_at?: string
  updated_at?: string
}

export interface Category {
  id?: number
  user_id: number
  name: string
  emoji?: string
  knowledge_base_id?: string
}

export interface Collection {
  id?: number
  user_id: number
  category_id?: number
  name?: string
  description?: string
  tags?: string
  created_at?: string
  updated_at?: string
}

export interface CollectionDetail {
  id?: number
  collection_id: number
  key: string
  value?: any
  created_at?: string
  updated_at?: string
}

export interface Attachment {
  id?: number
  attachment_id: string
  user_id: number
  url: string
  description?: string
  created_at?: string
}

export interface Post {
  id?: number
  post_id: string
  user_id: number
  refer_collection_id: number
  description?: string
  is_private?: boolean
  created_at?: string
  updated_at?: string
}

export interface Comment {
  id?: number
  post_id: number
  user_id: number
  content: string
  created_at?: string
  updated_at?: string
}

export interface Like {
  id?: number
  user_id: number
  asset_id: number
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        avatar_attachment_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建分类表
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        emoji TEXT,
        knowledge_base_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // 创建集合表
    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category_id INTEGER,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (collection_id) REFERENCES collections (id)
      )
    `)

    // 创建附件表
    db.exec(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attachment_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    // 创建集合附件关联表
    db.exec(`
      CREATE TABLE IF NOT EXISTS collection_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER NOT NULL,
        attachment_id TEXT NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections (id),
        FOREIGN KEY (attachment_id) REFERENCES attachments (attachment_id)
      )
    `)

    // 创建帖子表
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        refer_collection_id INTEGER NOT NULL,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        asset_id INTEGER NOT NULL,
        asset_type TEXT NOT NULL CHECK (asset_type IN ('post', 'comment')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

    console.log('Database tables initialized')
  }

  // 用户相关操作
  createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, avatar_attachment_id)
      VALUES (?, ?, ?, ?)
    `)
    const result = stmt.run(user.username, user.email, user.password_hash, user.avatar_attachment_id)
    return { ...user, id: result.lastInsertRowid as number }
  }

  getUserById(id: number): User | null {
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

  updateUser(id: number, updates: Partial<Omit<User, 'id' | 'created_at'>>): void {
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
    const stmt = db.prepare(`
      INSERT INTO categories (user_id, name, emoji, knowledge_base_id)
      VALUES (?, ?, ?, ?)
    `)
    const result = stmt.run(category.user_id, category.name, category.emoji, category.knowledge_base_id)
    return { ...category, id: result.lastInsertRowid as number }
  }

  getCategoriesByUserId(userId: number): Category[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM categories WHERE user_id = ?')
    return stmt.all(userId) as Category[]
  }

  // 集合相关操作
  createCollection(collection: Omit<Collection, 'id' | 'created_at' | 'updated_at'>): Collection {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO collections (user_id, category_id, name, description, tags)
      VALUES (?, ?, ?, ?, ?)
    `)
    const result = stmt.run(collection.user_id, collection.category_id, collection.name, collection.description, collection.tags)
    return { ...collection, id: result.lastInsertRowid as number }
  }

  getCollectionsByUserId(userId: number): Collection[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY created_at DESC')
    return stmt.all(userId) as Collection[]
  }

  getCollectionById(id: number): Collection | null {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM collections WHERE id = ?')
    return stmt.get(id) as Collection | null
  }

  // 集合详情相关操作
  createCollectionDetail(detail: Omit<CollectionDetail, 'id' | 'created_at' | 'updated_at'>): CollectionDetail {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO collection_details (collection_id, key, value)
      VALUES (?, ?, ?)
    `)
    const result = stmt.run(detail.collection_id, detail.key, JSON.stringify(detail.value))
    return { ...detail, id: result.lastInsertRowid as number }
  }

  getCollectionDetails(collectionId: number): CollectionDetail[] {
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
    const stmt = db.prepare(`
      INSERT INTO attachments (attachment_id, user_id, url, description)
      VALUES (?, ?, ?, ?)
    `)
    const result = stmt.run(attachment.attachment_id, attachment.user_id, attachment.url, attachment.description)
    return { ...attachment, id: result.lastInsertRowid as number }
  }

  getAttachmentsByUserId(userId: number): Attachment[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM attachments WHERE user_id = ? ORDER BY created_at DESC')
    return stmt.all(userId) as Attachment[]
  }

  // 帖子相关操作
  createPost(post: Omit<Post, 'id' | 'created_at' | 'updated_at'>): Post {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO posts (post_id, user_id, refer_collection_id, description, is_private)
      VALUES (?, ?, ?, ?, ?)
    `)
    const result = stmt.run(post.post_id, post.user_id, post.refer_collection_id, post.description, post.is_private ? 1 : 0)
    return { ...post, id: result.lastInsertRowid as number }
  }

  getPostsByUserId(userId: number): Post[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC')
    return stmt.all(userId) as Post[]
  }

  getPostsByCollectionId(collectionId: number): Post[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM posts WHERE refer_collection_id = ? ORDER BY created_at DESC')
    return stmt.all(collectionId) as Post[]
  }

  // 私有帖子相关操作
  getPrivatePostsByUserId(userId: number): Post[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM posts WHERE user_id = ? AND is_private = 1 ORDER BY created_at DESC')
    return stmt.all(userId) as Post[]
  }

  getPublicPostsByUserId(userId: number): Post[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM posts WHERE user_id = ? AND is_private = 0 ORDER BY created_at DESC')
    return stmt.all(userId) as Post[]
  }

  updatePostPrivacy(postId: string, isPrivate: boolean): boolean {
    const db = this.getDb()
    const stmt = db.prepare('UPDATE posts SET is_private = ?, updated_at = CURRENT_TIMESTAMP WHERE post_id = ?')
    const result = stmt.run(isPrivate ? 1 : 0, postId)
    return result.changes > 0
  }

  // 评论相关操作
  createComment(comment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>): Comment {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `)
    const result = stmt.run(comment.post_id, comment.user_id, comment.content)
    return { ...comment, id: result.lastInsertRowid as number }
  }

  getCommentsByPostId(postId: number): Comment[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC')
    return stmt.all(postId) as Comment[]
  }

  // 点赞相关操作
  createLike(like: Omit<Like, 'id' | 'created_at'>): Like {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO likes (user_id, asset_id, asset_type)
      VALUES (?, ?, ?)
    `)
    const result = stmt.run(like.user_id, like.asset_id, like.asset_type)
    return { ...like, id: result.lastInsertRowid as number }
  }

  removeLike(userId: number, assetId: number, assetType: 'post' | 'comment'): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      DELETE FROM likes WHERE user_id = ? AND asset_id = ? AND asset_type = ?
    `)
    stmt.run(userId, assetId, assetType)
  }

  getLikesByAsset(assetId: number, assetType: 'post' | 'comment'): Like[] {
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