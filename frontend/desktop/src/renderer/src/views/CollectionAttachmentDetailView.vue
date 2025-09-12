<template>
  <div class="detail-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-content">
        <button @click="$router.back()" class="back-btn">
          <svg
            class="back-icon"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1 class="page-title">附件详情</h1>
      </div>
    </header>

    <!-- Main Content -->
    <main v-if="collection && attachment" class="main-content">
      <div class="content-grid">
        <!-- Left Column: Attachment Preview -->
        <div class="attachment-preview">
          <!-- Image Display -->
          <div v-if="attachment?.url && isImage(attachment.url)" class="image-container">
            <img :src="getFullUrl(attachment.url)" alt="附件预览" class="preview-image" />
            <!-- 删除悬停放大镜和overlay层 -->
          </div>

          <!-- File Preview -->
          <div v-else-if="attachment?.url" class="file-preview">
            <FileIcon class="file-icon" />
            <p class="file-type">{{ getFileType(attachment.url) }}</p>
            <a
              :href="getFullUrl(attachment.url)"
              target="_blank"
              rel="noopener noreferrer"
              class="download-btn"
            >
              <DownloadIcon class="icon" />
              下载文件
            </a>
          </div>

          <!-- No Attachment -->
          <div v-else class="no-attachment">
            <p>无附件信息</p>
          </div>
        </div>

        <!-- Right Column: Details -->
        <div class="details-panel">
          <!-- Description -->
          <div class="detail-section">
            <h2 class="section-title">描述</h2>
            <p class="description">{{ attachment.description || '暂无描述' }}</p>
          </div>

          <!-- Tags -->
          <div class="detail-section">
            <h3 class="section-title">标签</h3>
            <div class="tags-container">
              <span v-for="(tag, index) in tagList" :key="index" class="tag">
                {{ tag }}
              </span>
              <p v-if="tagList.length === 0" class="no-tags">无标签</p>
            </div>
          </div>

          <!-- Meta Info -->
          <div class="meta-info">
            <div class="meta-item">
              <CalendarIcon class="meta-icon" />
              <span class="meta-label">创建于:</span>
              <span class="meta-value">{{ formatDate(collection.created_at) }}</span>
            </div>
            <div class="meta-item">
              <ClockIcon class="meta-icon" />
              <span class="meta-label">更新于:</span>
              <span class="meta-value">{{ formatDate(collection.updated_at) }}</span>
            </div>
            <div class="meta-item">
              <UserIcon class="meta-icon" />
              <span class="meta-label">上传用户:</span>
              <span class="meta-value">用户 #{{ attachment.user_id }}</span>
            </div>
            <div class="meta-item">
              <LinkIcon class="meta-icon" />
              <span class="meta-label">文件链接:</span>
              <a
                :href="getFullUrl(attachment.url)"
                target="_blank"
                rel="noopener noreferrer"
                class="file-link"
              >
                点击打开
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-title">加载失败</div>
      <div class="error-message">{{ error }}</div>
    </div>

    <!-- Default State -->
    <div v-else class="default-state">
      <div class="state-title">数据状态异常</div>
      <div class="state-details">
        <p>loading: {{ loading }}</p>
        <p>collection: {{ collection ? '已加载' : '未加载' }}</p>
        <p>attachment: {{ attachment ? '已加载' : '未加载' }}</p>
        <p>error: {{ error || '无错误' }}</p>
      </div>
    </div>

    <!-- Footer -->
    <footer class="page-footer">
      <div class="footer-content">
        <p>© 2025 Memora</p>
      </div>
    </footer>

    <!-- Image Modal -->
    <div
      v-if="showImageModal && attachment?.url"
      class="image-modal"
      @click="showImageModal = false"
    >
      <button @click.stop="showImageModal = false" class="modal-close">
        <svg
          class="close-icon"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        :src="getFullUrl(attachment.url)"
        :alt="attachment?.description || '附件图片'"
        class="modal-image"
        @click.stop
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCollectionWithAttachment } from '@/api'
import { isAuthenticated } from '@/api'

// Icons
const createIcon = (paths) => ({
  render() {
    return h(
      'svg',
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 2
      },
      paths.map((d) => h('path', { d }))
    )
  }
})

const AttachmentIcon = createIcon([
  'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.47 17.36a2 2 0 0 1-2.83-2.83l7.07-7.07'
])
const ImageIcon = createIcon([
  'M8.5 8.5 m -1.5 0 a 1.5 1.5 0 1 0 3 0 a 1.5 1.5 0 1 0 -3 0',
  'M21 15l-5-5L5 21',
  'M3 3h18v18H3z'
])
const FileIcon = createIcon([
  'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  'M14 2v6h6'
])
const CalendarIcon = createIcon(['M3 4h18v18H3z', 'M16 2v4', 'M8 2v4', 'M3 10h18'])
const ClockIcon = createIcon(['M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M12 6v6l4 2'])
const DownloadIcon = createIcon([
  'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
  'M7 10l5 5 5-5',
  'M12 15V3'
])
const LinkIcon = createIcon([
  'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
  'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'
])
const RotateIcon = createIcon([
  'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8',
  'M21 3v5h-5',
  'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16',
  'M3 21v-5h5'
])
const ZoomInIcon = createIcon([
  'M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0',
  'm21 21-4.35-4.35',
  'M11 8v6',
  'M8 11h6'
])
const UserIcon = createIcon([
  'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
  'M12 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0'
])

const route = useRoute()
const router = useRouter()
const collectionId = route.params.collection_id

const collection = ref(null)
const attachment = ref(null)
const loading = ref(true)
const error = ref(null)
const showImageModal = ref(false)

// 请求收藏和附件详情
const fetchCollectionAndAttachment = async () => {
  // 检查用户是否已登录
  if (!isAuthenticated()) {
    console.log('用户未登录，跳转到登录页面')
    router.push('/login')
    return
  }

  loading.value = true
  error.value = null

  try {
    // 使用服务函数获取完整数据
    const result = await getCollectionWithAttachment(collectionId)

    collection.value = result.collection
    attachment.value = result.attachment
  } catch (e) {
    error.value = e.message

    // 如果是认证错误，重定向到登录页面
    if (e.code === 'AUTH_REQUIRED') {
      console.log('认证失败，跳转到登录页面')
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

const tagList = computed(() => {
  if (!collection.value?.tags) return []
  return collection.value.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag)
})

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const isImage = (url) => {
  if (!url) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
  const lowerUrl = url.toLowerCase()
  return imageExtensions.some((ext) => lowerUrl.endsWith(ext))
}

const getFileType = (url) => {
  if (!url) return '未知'

  if (isImage(url)) return '图片'

  const extension = url.toLowerCase().split('.').pop()
  const typeMap = {
    pdf: 'PDF文档',
    doc: 'Word文档',
    docx: 'Word文档',
    txt: '文本文档',
    zip: '压缩包',
    rar: '压缩包'
  }

  return typeMap[extension] || '文档'
}

const getFullUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  // Handle one or more backslashes and convert to a single forward slash
  const normalizedUrl = url.replace(/\\+/g, '/')
  return `http://localhost:8000/${normalizedUrl}`
}

const openImageModal = () => {
  showImageModal.value = true
}

const getFileSize = (url) => {
  // 这是一个模拟函数，实际应该从服务器获取文件大小
  // 可以通过HEAD请求获取Content-Length
  return '未知大小'
}

// 键盘事件处理
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    showImageModal.value = false
  }
}

onMounted(() => {
  fetchCollectionAndAttachment()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f9fafb;

  .page-header {
    background-color: white;
    border-bottom: 1px solid #e5e7eb;
    margin-top: 40px;

    .header-content {
      max-width: 1280px;
      margin: 0 auto;
      padding: 16px 24px;

      .back-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background-color: #f3f4f6;
        color: #374151;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s;
        margin-bottom: 8px;

        &:hover {
          background-color: #e5e7eb;
        }

        .back-icon {
          width: 16px;
          height: 16px;
        }
      }

      .page-title {
        font-size: 20px;
        font-weight: bold;
        color: black;
        margin: 0;
      }
    }
  }

  .main-content {
    max-width: 1280px;
    margin: 0 auto;
    padding: 32px 24px;

    .content-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 32px;

      @media (min-width: 1024px) {
        grid-template-columns: 2fr 1fr;
      }
    }
  }

  .attachment-preview {
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;

    .image-container {
      position: relative;
      aspect-ratio: 16 / 9;
      background-color: #f3f4f6;

      .preview-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        background-color: white;
      }
      /* 删除.overlay和.zoom-icon相关样式 */
    }

    .file-preview {
      padding: 64px 32px;
      text-align: center;

      .file-icon {
        width: 96px;
        height: 96px;
        color: #d1d5db;
        margin: 0 auto 16px;
      }

      .file-type {
        font-size: 18px;
        font-weight: 500;
        color: #1f2937;
        margin-bottom: 8px;
      }

      .download-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        padding: 8px 16px;
        background-color: #1f2937;
        color: white;
        border-radius: 8px;
        text-decoration: none;
        transition: background-color 0.2s;

        &:hover {
          background-color: black;
        }

        .icon {
          width: 16px;
          height: 16px;
        }
      }
    }

    .no-attachment {
      padding: 64px 32px;
      text-align: center;
      color: #9ca3af;
    }
  }

  .details-panel {
    display: flex;
    flex-direction: column;
    gap: 24px;

    .detail-section {
      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 8px;
      }

      .description {
        color: #4b5563;
        line-height: 1.6;
      }

      &:not(:last-child) {
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 16px;
      }
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .tag {
        padding: 4px 10px;
        background-color: #f3f4f6;
        color: #374151;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 500;
      }

      .no-tags {
        color: #9ca3af;
        font-size: 14px;
      }
    }

    .meta-info {
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 16px;

        .meta-icon {
          width: 16px;
          height: 16px;
          color: #9ca3af;
        }

        .meta-label {
          font-weight: 500;
          color: #374151;
        }

        .meta-value {
          color: #6b7280;
        }

        .file-link {
          color: #4b5563;
          text-decoration: underline;
          transition: color 0.2s;
          word-break: break-all;

          &:hover {
            color: black;
          }
        }
      }
    }
  }

  .error-state,
  .default-state {
    text-align: center;
    padding: 96px 24px;

    .error-title,
    .state-title {
      font-size: 18px;
      margin-bottom: 8px;
    }

    .error-title {
      color: #ef4444;
    }

    .state-title {
      color: #eab308;
    }

    .error-message {
      color: #6b7280;
    }

    .state-details {
      color: #6b7280;
      font-size: 14px;

      p {
        margin-bottom: 8px;
      }
    }
  }

  .page-footer {
    border-top: 1px solid #e5e7eb;
    margin-top: 64px;

    .footer-content {
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
  }

  .image-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;

    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      color: white;
      background: none;
      border: none;
      cursor: pointer;
      z-index: 10;
      transition: color 0.2s;

      &:hover {
        color: #d1d5db;
      }

      .close-icon {
        width: 32px;
        height: 32px;
      }
    }

    .modal-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }
  }
}
</style>
