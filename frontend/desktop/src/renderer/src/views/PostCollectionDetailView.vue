<template>
  <div class="min-h-screen bg-primary">
    <!-- Header -->
    <header class="border-b border-muted-border flex-shrink-0 sticky top-0 bg-primary z-10">
      <div class="max-w-6xl mx-auto px-6 py-5">
        <div class="flex justify-between items-start mb-2">
          <button
            class="px-2 py-1 bg-muted hover:bg-muted rounded text-primary-text font-medium flex items-center gap-2"
            style="font-size: 12px"
            @click="$router.back()"
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
            {{ t('collection.back') }}
          </button>
        </div>
        <div class="flex items-center gap-3 mb-2">
          <BookmarkIcon class="w-6 h-6 text-accent-text" />
          <h1 class="text-2xl font-bold text-accent-text">
            {{ t('community.postCollectionDetail') }}
          </h1>
        </div>

        <p class="text-primary-text">{{ t('community.viewPostCollection') }}</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-6 py-12">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="flex items-center gap-2 text-primary-text">
          <div
            class="w-5 h-5 border-2 border-muted-border border-t-blue-600 rounded-full animate-spin"
          ></div>
          {{ t('community.loadingPost') }}
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="text-center py-16">
        <div
          class="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <AlertCircle class="w-12 h-12 text-red-600" />
        </div>
        <h2 class="text-xl font-semibold text-accent-text mb-4">{{ t('community.loadFailed') }}</h2>
        <p class="text-primary-text mb-6">{{ error }}</p>
        <button
          class="px-6 py-3 bg-blue-600 text-muted-text rounded-lg hover:bg-blue-700 transition-colors"
          @click="fetchCollectionDetails"
        >
          {{ t('community.retry') }}
        </button>
      </div>

      <!-- 内容 -->
      <div
        v-else-if="collection"
        class="border border-muted-border shadow-sm rounded-lg bg-primary"
      >
        <div class="p-6 pb-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <!-- 移除标题展示 -->
              <!-- <h2 class="text-2xl font-bold text-accent-text mb-3 leading-tight">{{ collection.details.title || '无标题' }}</h2> -->
              <!-- summary部分处理为json解析 -->
              <p class="text-base text-primary-text leading-relaxed">
                {{ parsedSummary }}
              </p>
            </div>
            <!-- 删除访问原文按钮 -->
            <!-- <div class="flex gap-2">
              <button
                @click="openOriginalLink"
                class="shrink-0 px-4 py-2 border border-muted-border rounded-md hover:bg-muted bg-transparent transition-colors flex items-center gap-2 text-sm"
              >
                <ExternalLinkIcon class="w-4 h-4" />
                访问原文
              </button>
            </div> -->
          </div>

          <div class="border-t border-muted-border my-6"></div>

          <!-- Meta Information -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="flex items-center gap-2">
              <CalendarIcon class="w-4 h-4 text-primary-text" />
              <span class="text-sm text-primary-text">{{ t('community.createdAt') }}</span>
              <span class="text-sm font-medium text-accent-text">{{
                collection ? formatDate(collection.created_at) : '--'
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <ClockIcon class="w-4 h-4 text-primary-text" />
              <span class="text-sm text-primary-text">{{ t('community.updatedAt') }}</span>
              <span class="text-sm font-medium text-accent-text">{{
                collection ? formatDate(collection.updated_at) : '--'
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <TagIcon class="w-4 h-4 text-primary-text" />
              <span class="text-sm text-primary-text">{{ t('community.category') }}</span>
              <span class="text-sm font-medium text-accent-text">{{
                collection ? collection.category_name || t('community.uncategorized') : '--'
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <HashIcon class="w-4 h-4 text-primary-text" />
              <span class="text-sm text-primary-text">{{ t('community.tags') }}</span>
              <span class="text-sm font-medium text-accent-text"
                >{{ collection && collection.tags ? collection.tags.split(',').length : 0 }}个</span
              >
            </div>
          </div>

          <!-- Tags -->
          <div class="flex items-center gap-2 pt-4">
            <span class="text-sm font-medium text-accent-text">{{ t('community.tags') }}</span>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(tag, index) in tagList"
                :key="index"
                class="px-2 py-1 border border-muted-border text-primary-text rounded text-xs hover:bg-muted"
              >
                #{{ tag }}
              </span>
              <span v-if="tagList.length === 0" class="text-sm text-primary-text">{{
                t('community.noTags')
              }}</span>
            </div>
          </div>
        </div>

        <div class="p-6 pt-0">
          <!-- URL Display -->
          <div
            v-if="collection && collection.details && collection.details.url"
            class="mb-6 p-4 bg-muted rounded-lg border border-muted-border"
          >
            <div class="flex items-center gap-2 mb-2">
              <ExternalLinkIcon class="w-4 h-4 text-primary-text" />
              <span class="text-sm font-medium text-accent-text">{{
                t('community.originalLink')
              }}</span>
            </div>
            <a
              :href="collection.details.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-primary-text hover:text-accent-text transition-colors break-all"
            >
              {{ collection.details.url }}
            </a>
          </div>

          <!-- Content Preview -->
          <div v-if="collection && collection.details && collection.details.content">
            <h3 class="text-lg font-semibold text-accent-text mb-4">
              {{ t('community.contentPreview') }}
            </h3>
            <div class="prose prose-gray max-w-none">
              <!-- 新增：md渲染 -->
              <div v-html="contentMarkdown"></div>
              <!-- 保留原有纯文本分段渲染（如不需要可删除） -->
              <!--
              <div class="text-primary-text leading-relaxed space-y-4">
                <p v-for="(paragraph, index) in contentParagraphs" :key="index" class="text-sm">
                  {{ paragraph }}
                </p>
              </div>
              -->
            </div>
          </div>

          <!-- 如果没有内容预览 -->
          <div v-else class="text-center py-8">
            <div
              class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <FileText class="w-8 h-8 text-primary-text" />
            </div>
            <p class="text-primary-text">{{ t('community.noContentPreview') }}</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-muted-border mt-16">
      <div class="max-w-4xl mx-auto px-6 py-8">
        <div class="text-center text-sm text-primary-text">
          <p>{{ t('community.copyright') }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getPostCollectionDetails } from '@/api'
import { getPublicCollectionDetails } from '@/api'
import { marked } from 'marked'

const { t } = useI18n()

// Icons
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

const TagIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`
}

const HashIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`
}

const AlertCircle = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
}

const FileText = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>`
}

const route = useRoute()
const router = useRouter()
const postId = route.params.post_id
const collectionId = route.params.collection_id

const collection = ref(null)
const loading = ref(true)
const error = ref(null)

const fetchCollectionDetails = async () => {
  loading.value = true
  error.value = null

  try {
    let result

    // 如果有postId，使用推文收藏详情接口
    if (postId) {
      result = await getPostCollectionDetails(postId)
      console.log('推文收藏详情API返回结果:', result)

      if (result && result.data && result.data.collection) {
        collection.value = result.data.collection
      } else {
        throw new Error('无法获取收藏详情')
      }
    }
    // 如果有collectionId，使用公共收藏详情接口
    else if (collectionId) {
      result = await getPublicCollectionDetails(collectionId)
      console.log('公共收藏详情API返回结果:', result)

      if (result && result.data && result.data.collection) {
        collection.value = result.data.collection
      } else {
        throw new Error('无法获取收藏详情')
      }
    } else {
      throw new Error('缺少必要的参数')
    }
  } catch (e) {
    error.value = e.message || '加载失败'
    console.error('获取收藏详情失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCollectionDetails()
})

const tagList = computed(() => {
  if (!collection.value?.tags) return []
  return collection.value.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag)
})

const contentParagraphs = computed(() => {
  if (!collection.value?.details?.content) return []
  return collection.value.details.content.split('\n\n').filter((p) => p.trim())
})

// 新增：正文 markdown 渲染
const contentMarkdown = computed(() => {
  const content = collection.value?.details?.content
  console.log('原始content数据:', content)
  if (!content) {
    console.log('content为空，返回空字符串')
    return ''
  }
  
  // 配置marked禁用HTML标签渲染，提高安全性
  const renderer = new marked.Renderer()
  
  // 禁用HTML标签
  renderer.html = (html) => {
    return html.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  
  const result = marked(content, { 
    renderer,
    breaks: true,
    gfm: true
  })
  console.log('Markdown渲染结果长度:', result.length)
  return result
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

// summary json解析
const parsedSummary = computed(() => {
  const summary = collection.value?.details?.summary
  console.log('原始summary数据:', summary)

  if (!summary) {
    console.log('summary为空，返回默认值')
    return t('community.noSummary')
  }

  // 如果是纯字符串，直接返回
  if (typeof summary === 'string') {
    console.log('summary是字符串，直接返回:', summary)
    return summary
  }

  // 如果是对象且有 summary 字段
  if (typeof summary === 'object' && summary.summary) {
    console.log('summary是对象，返回summary字段:', summary.summary)
    return summary.summary
  }

  console.log('其他情况，转为字符串:', String(summary))
  return String(summary)
})
</script>

<style scoped>
.prose {
  max-width: none;
}

.prose p {
  margin: 0;
  line-height: 1.6;
}
</style>
