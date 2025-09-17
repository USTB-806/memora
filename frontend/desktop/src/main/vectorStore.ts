import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

// 简单的向量存储接口
export interface VectorDocument {
  id: string
  content: string
  metadata?: Record<string, any>
  embedding?: number[]
  created_at?: string
}

export interface SearchResult {
  document: VectorDocument
  score: number
}

// 简单的本地向量存储类
export class LocalVectorStore {
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
      this.dbPath = path.join(appDataPath, 'vector_store.db')
      console.log('Vector store database path:', this.dbPath)

      // 确保目录存在
      const dbDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
        console.log('Created vector store directory:', dbDir)
      }
    }
    return this.dbPath
  }

  private getDb(): Database.Database {
    if (!this.db) {
      const dbPath = this.getDbPath()

      const dbDir = path.dirname(dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }
      this.db = new Database(dbPath)

      // 创建向量存储表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          metadata TEXT,
          embedding TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS collections (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS collection_documents (
          collection_id TEXT,
          document_id TEXT,
          PRIMARY KEY (collection_id, document_id),
          FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE,
          FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
        );

        -- 创建向量索引（简化版本，使用余弦相似度）
        CREATE VIRTUAL TABLE IF NOT EXISTS document_search USING fts5(
          id, content, metadata
        );
      `)
    }
    return this.db
  }

  // 添加文档到向量存储
  addDocument(document: VectorDocument, collectionId?: string): string {
    const db = this.getDb()

    // 如果没有提供ID，生成一个
    const docId = document.id || crypto.randomUUID()

    // 序列化metadata和embedding
    const metadataStr = document.metadata ? JSON.stringify(document.metadata) : null
    const embeddingStr = document.embedding ? JSON.stringify(document.embedding) : null

    // 插入文档
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO documents (id, content, metadata, embedding, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(
      docId,
      document.content,
      metadataStr,
      embeddingStr,
      document.created_at || new Date().toISOString()
    )

    // 添加到全文搜索索引
    const searchStmt = db.prepare(`
      INSERT OR REPLACE INTO document_search (id, content, metadata)
      VALUES (?, ?, ?)
    `)
    searchStmt.run(docId, document.content, metadataStr || '')

    // 如果指定了集合，添加到集合中
    if (collectionId) {
      this.addDocumentToCollection(docId, collectionId)
    }

    return docId
  }

  // 从向量存储中删除文档
  removeDocument(documentId: string): boolean {
    const db = this.getDb()

    // 从全文搜索索引中删除
    const searchStmt = db.prepare('DELETE FROM document_search WHERE id = ?')
    searchStmt.run(documentId)

    // 从文档表中删除
    const stmt = db.prepare('DELETE FROM documents WHERE id = ?')
    const result = stmt.run(documentId)

    return result.changes > 0
  }

  // 搜索相似文档（简化版本，使用关键词搜索）
  searchSimilar(query: string, limit: number = 10): SearchResult[] {
    const db = this.getDb()

    const stmt = db.prepare(`
      SELECT d.*, ds.rank
      FROM document_search ds
      JOIN documents d ON ds.id = d.id
      WHERE document_search MATCH ?
      ORDER BY ds.rank
      LIMIT ?
    `)

    const rows = stmt.all(query, limit) as any[]

    return rows.map(row => ({
      document: {
        id: row.id,
        content: row.content,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
        created_at: row.created_at
      },
      score: row.rank || 0
    }))
  }

  // 获取文档
  getDocument(documentId: string): VectorDocument | null {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM documents WHERE id = ?')
    const row = stmt.get(documentId) as any

    if (!row) return null

    return {
      id: row.id,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      created_at: row.created_at
    }
  }

  // 获取所有文档
  getAllDocuments(limit: number = 100): VectorDocument[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM documents ORDER BY created_at DESC LIMIT ?')
    const rows = stmt.all(limit) as any[]

    return rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      created_at: row.created_at
    }))
  }

  // 创建集合
  createCollection(id: string, name: string, description?: string): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO collections (id, name, description)
      VALUES (?, ?, ?)
    `)
    stmt.run(id, name, description || '')
  }

  // 删除集合
  removeCollection(collectionId: string): boolean {
    const db = this.getDb()
    const stmt = db.prepare('DELETE FROM collections WHERE id = ?')
    const result = stmt.run(collectionId)
    return result.changes > 0
  }

  // 添加文档到集合
  addDocumentToCollection(documentId: string, collectionId: string): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO collection_documents (collection_id, document_id)
      VALUES (?, ?)
    `)
    stmt.run(collectionId, documentId)
  }

  // 从集合中移除文档
  removeDocumentFromCollection(documentId: string, collectionId: string): boolean {
    const db = this.getDb()
    const stmt = db.prepare(`
      DELETE FROM collection_documents
      WHERE collection_id = ? AND document_id = ?
    `)
    const result = stmt.run(collectionId, documentId)
    return result.changes > 0
  }

  // 获取集合中的文档
  getCollectionDocuments(collectionId: string): VectorDocument[] {
    const db = this.getDb()
    const stmt = db.prepare(`
      SELECT d.* FROM documents d
      JOIN collection_documents cd ON d.id = cd.document_id
      WHERE cd.collection_id = ?
      ORDER BY d.created_at DESC
    `)
    const rows = stmt.all(collectionId) as any[]

    return rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      created_at: row.created_at
    }))
  }

  // 获取所有集合
  getCollections(): { id: string; name: string; description?: string; created_at: string }[] {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM collections ORDER BY created_at DESC')
    return stmt.all() as any[]
  }

  // 关闭数据库连接
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}