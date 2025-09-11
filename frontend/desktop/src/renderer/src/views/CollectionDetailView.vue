<template>
  <div class="min-h-screen bg-white dark:bg-gray-900">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-4xl mx-auto px-6 py-8">
        <button
          @click="$router.back()"
          class="mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
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
          <BookmarkIcon class="w-6 h-6 text-black dark:text-gray-100" />
          <h1 class="text-2xl font-bold text-black dark:text-gray-100">网页收藏详情</h1>
        </div>
        <p class="text-gray-600 dark:text-gray-400">查看收藏的详细内容</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-6 py-12">
      <div class="border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg bg-white dark:bg-gray-800">
        <div class="p-6 pb-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <h2 class="text-2xl font-bold text-black dark:text-gray-100 mb-3 leading-tight">{{ details.title }}</h2>
              <p class="text-base text-gray-600 dark:text-gray-400 leading-relaxed">{{ details.summary }}</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="showPublishModal = true"
                class="shrink-0 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
              >
                <ShareIcon class="w-4 h-4" />
                分享到社区
              </button>
              <button
                @click="openOriginalLink"
                class="shrink-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 bg-transparent dark:bg-transparent transition-colors flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <ExternalLinkIcon class="w-4 h-4" />
                访问原文
              </button>
            </div>
          </div>

          <div class="border-t border-gray-200 my-6"></div>

          <!-- Meta Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-3">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span class="font-medium text-black">作者:</span>
                <span>{{ details.author }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <CalendarIcon class="w-4 h-4" />
                <span>{{ details.publishDate }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <ClockIcon class="w-4 h-4" />
                <span>{{ details.readTime }}</span>
              </div>
            </div>

            <div class="space-y-3">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <EyeIcon class="w-4 h-4" />
                <span>{{ details.views }} 次浏览</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <MessageSquareIcon class="w-4 h-4" />
                <span>{{ details.comments }} 条评论</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-black">分类:</span>
                <span class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{{
                  details.category
                }}</span>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="flex items-center gap-2 pt-4">
            <span class="text-sm font-medium text-black">标签:</span>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(tag, index) in details.value && details.value.tags
                  ? details.value.tags
                  : []"
                :key="index"
                class="px-2 py-1 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50"
              >
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>

        <div class="p-6 pt-0">
          <!-- URL Display -->
          <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center gap-2 mb-2">
              <ExternalLinkIcon class="w-4 h-4 text-gray-500" />
              <span class="text-sm font-medium text-black">原文链接</span>
            </div>
            <a
              :href="details.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-gray-600 hover:text-black transition-colors break-all"
            >
              {{ details.url }}
            </a>
          </div>

          <!-- Content Preview -->
          <div>
            <h3 class="text-lg font-semibold text-black mb-4">内容预览</h3>
            <div class="prose prose-gray max-w-none">
              <div class="text-gray-700 leading-relaxed space-y-4">
                <p v-for="(paragraph, index) in contentParagraphs" :key="index" class="text-sm">
                  {{ paragraph }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Collection Stats -->
      <div class="mt-12 text-center">
        <div
          class="inline-flex items-center gap-6 px-6 py-4 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div class="text-center">
            <div class="text-2xl font-bold text-black">1</div>
            <div class="text-sm text-gray-600">收藏文章</div>
          </div>
          <div class="w-px h-8 bg-gray-300"></div>
          <div class="text-center">
            <div class="text-2xl font-bold text-black">
              {{ details.value && details.value.category ? details.value.category : '' }}
            </div>
            <div class="text-sm text-gray-600">主要分类</div>
          </div>
          <div class="w-px h-8 bg-gray-300"></div>
          <div class="text-center">
            <div class="text-2xl font-bold text-black">
              {{ details.value && details.value.tags ? details.value.tags.length : 0 }}
            </div>
            <div class="text-sm text-gray-600">相关标签</div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-200 mt-16">
      <div class="max-w-4xl mx-auto px-6 py-8">
        <div class="text-center text-sm text-gray-500">
          <p>© 2025 网页收藏系统 · 简约 · 现代 · 高效</p>
        </div>
      </div>
    </footer>

    <!-- 发布到社区模态框 -->
    <PublishToCommunityModal
      :show="showPublishModal"
      :collection-id="collectionId"
      @close="showPublishModal = false"
      @success="handlePublishSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getCollectionDetails } from '@/api'
import { isAuthenticated } from '@/api'
import PublishToCommunityModal from '../components/PublishToCommunityModal.vue'

const { t } = useI18n()

// Icons (你可以使用任何图标库，这里用简单的SVG组件)
const BookmarkIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`
}

const ExternalLinkIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`
}

const CalendarIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
}

const ClockIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`
}

const EyeIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
}

const MessageSquareIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
}

const ShareIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`
}

const route = useRoute()
const router = useRouter()
const collectionId = route.params.collection_id

const details = ref({})
const loading = ref(true)
const showPublishModal = ref(false)

const fetchDetails = async () => {
  // 检查用户是否已登录
  if (!isAuthenticated()) {
    console.log('用户未登录，跳转到登录页面')
    router.push('/login')
    return
  }

  loading.value = true
  try {
    const result = await getCollectionDetails(collectionId)

    if (!result?.details) {
      details.value = {}
      return
    }

    details.value = result.details
  } catch (e) {
    details.value = {}
    // 如果是认证错误，重定向到登录页面
    if (e.detail === 'Not authenticated' || e.message?.includes('401')) {
      console.log('认证失败，跳转到登录页面')
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDetails()
})

const contentParagraphs = computed(() => {
  if (!details.value.content) return []
  return details.value.content.split('\n\n').filter((p) => p.trim())
})

const openOriginalLink = () => {
  if (details.value.url) {
    window.open(details.value.url, '_blank', 'noopener,noreferrer')
  }
}

const handlePublishSuccess = (result) => {
  console.log('发布成功:', result)
  // 可以添加成功提示或其他处理逻辑
  alert(t('community.publishSuccess'))
}
</script>
