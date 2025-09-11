<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="max-w-6xl mx-auto px-6 py-8">
        <button
          @click="$router.back()"
          class="mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2 transition-colors"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <div class="flex items-center gap-3 mb-2">
          <ImageIcon class="w-6 h-6 text-black dark:text-gray-100" />
          <h1 class="text-2xl font-bold text-black dark:text-gray-100">附件收藏</h1>
        </div>
        <p class="text-gray-500 dark:text-gray-400">分类 #{{ categoryId }} 下的所有附件</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-6 py-12">
      <div v-if="loading" class="text-center py-16 text-gray-500 dark:text-gray-400">加载中...</div>
      <div v-else>
        <div v-if="collections.length === 0" class="text-center py-16">
          <ImageIcon class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">没有找到相关附件收藏</h3>
          <p class="text-gray-500 dark:text-gray-400">该分类下暂无包含附件的收藏</p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="item in collections"
            :key="item.id"
            class="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col"
            @click="viewAttachmentDetail(item)"
          >
            <!-- Image Thumbnail -->
            <div class="aspect-video bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden">
              <img
                v-if="item.imageUrl && isImage(item.imageUrl)"
                :src="getFullUrl(item.imageUrl)"
                alt="附件预览"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex items-center justify-center bg-gray-200">
                <FileIcon class="w-10 h-10 text-gray-400" />
              </div>
            </div>

            <div class="p-5 flex-1 flex flex-col">
              <!-- Title (Description) -->
              <h3
                class="text-base font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-black transition-colors flex-1"
              >
                {{ item.description || '无描述' }}
              </h3>

              <!-- Tags -->
              <div class="mb-4">
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="(tag, index) in getTagList(item.tags)"
                    :key="index"
                    class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <!-- Footer -->
              <div
                class="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3"
              >
                <span>{{ formatDate(item.created_at) }}</span>
                <div
                  class="flex items-center gap-1 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <EyeIcon class="w-3.5 h-3.5" />
                  <span>查看</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-200 mt-16">
      <div class="max-w-6xl mx-auto px-6 py-8">
        <div class="text-center text-sm text-gray-500">
          <p>© 2025 网页收藏系统 · 简约 · 现代 · 高效</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAttachmentCollectionsByCategory } from '@/api'
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

const ImageIcon = createIcon([
  'M8.5 8.5 m -1.5 0 a 1.5 1.5 0 1 0 3 0 a 1.5 1.5 0 1 0 -3 0',
  'M21 15l-5-5L5 21',
  'M3 3h18v18H3z'
])
const FileIcon = createIcon([
  'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  'M14 2v6h6'
])
const EyeIcon = createIcon([
  'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
  'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0'
])

const AttachmentIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.47 17.36a2 2 0 0 1-2.83-2.83l7.07-7.07"/></svg>`
}

const CalendarIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
}

const ClockIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`
}

// 路由参数
const route = useRoute()
const router = useRouter()
const categoryId = route.params.category_id

const collections = ref([])
const loading = ref(false)

// 基于分类获取带有附件属性的收藏
const fetchAttachmentCollectionsByCategory = async () => {
  // 检查用户是否已登录
  if (!isAuthenticated()) {
    console.log('用户未登录，跳转到登录页面')
    router.push('/login')
    return
  }

  loading.value = true

  try {
    const collectionsWithDetails = await getAttachmentCollectionsByCategory(categoryId)
    collections.value = collectionsWithDetails
  } catch (e) {
    // 认证错误，重定向到登录页面
    if (e.code === 'AUTH_REQUIRED') {
      console.log('认证失败，跳转到登录页面')
      router.push('/login')
    }

    // 打印错误
    console.error('获取失败', e)
  } finally {
    loading.value = false
  }
}

const viewAttachmentDetail = (item) => {
  router.push({ name: 'CollectionAttachmentDetail', params: { collection_id: item.id } })
}

const getTagList = (tags) => {
  if (!tags || typeof tags !== 'string') return []
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag)
    .slice(0, 5) // 最多显示5个标签
}

const getFullUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  // Handle one or more backslashes and convert to a single forward slash
  const normalizedUrl = url.replace(/\\+/g, '/')
  return `http://localhost:8000/${normalizedUrl}`
}

const isImage = (url) => {
  if (!url) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
  const lowerUrl = url.toLowerCase()
  return imageExtensions.some((ext) => lowerUrl.endsWith(ext))
}

onMounted(() => {
  fetchAttachmentCollectionsByCategory()
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
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
