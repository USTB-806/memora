<template>
  <div class="h-screen bg-white flex flex-col">
    <!-- Header -->
    <header class="border-b border-gray-200 flex-shrink-0">
      <div class="max-w-6xl mx-auto px-6 py-5">
        <div class="flex justify-between items-start mb-2">
          <button
            @click="$router.back()"
            class="px-2 py-1 bgconst createKnowledgeBase = async () => { if (!categoryId || creatingKnowledgeBase.value) return try { creatingKnowledgeBase.value = true const result = await apiCreateKnowledgeBase(categoryId) if (result.code === ) { // 知识库创建已启动，后台处理 alert('知识库创建已启动，请稍后刷新页面查看状态。') // 由于是后台任务，不立即重新获取数据 } } catch (error) { console.error('创建知识库失败:', error) alert('创建知识库失败: ' + (error.detail || error.message || '未知错误')) } finally { creatingKnowledgeBase.value = false } }-gray-200 rounded text-gray-700 font-medium flex items-center gap-2"
            style="font-size: 12px"
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

        <div class="flex items-center gap-3 mb-2" style="justify-content: space-between">
          <div>
            <BookmarkIcon class="w-6 h-6 text-black" />
            <h1 class="text-2xl font-bold text-black">
              {{ category?.emoji }} {{ category?.name }}
            </h1>
          </div>
          <div class="flex items-center gap-3">
            <!-- Knowledge Base Button -->
            <button
              v-if="!category?.knowledge_base_id"
              @click="createKnowledgeBase"
              :disabled="creatingKnowledgeBase"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-300 rounded text-gray-700 font-medium flex items-center gap-2"
            >
              <svg
                v-if="creatingKnowledgeBase"
                class="animate-spin w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                  class="opacity-25"
                ></circle>
                <path
                  fill="currentColor"
                  class="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <svg
                v-else
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
              {{
                creatingKnowledgeBase
                  ? t('collection.creating')
                  : t('collection.createKnowledgeBase')
              }}
            </button>
            <!-- Ask AI Button -->
            <button
              v-else
              @click="showAskAIPanel = true"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium flex items-center gap-2"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
              {{ t('collection.askAI') }}
            </button>

            <!-- Search Box -->
            <div class="relative">
              <input
                v-model="searchQuery"
                @input="handleSearch"
                @keydown.enter="handleSearch"
                type="text"
                :placeholder="t('collection.searchCollections')"
                class="pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-64"
              />
              <button
                v-if="searchQuery"
                @click="clearSearch"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  class="h-4 w-4 text-gray-400 hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <p class="text-gray-500 text-sm">
          {{ t('collection.totalCollections', { count: filteredCollections.length }) }}
          <span v-if="searchQuery"
            >({{
              t('collection.filtered', { count: collections.length - filteredCollections.length })
            }})</span
          >
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl px-6 py-6 flex-1 min-h-0">
      <div v-if="loading" class="text-center py-16 text-gray-500">
        {{ t('collection.loading') }}
      </div>
      <div v-else class="h-full">
        <div v-if="filteredCollections.length === 0" class="text-center py-16">
          <BookmarkIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{
              searchQuery ? t('collection.noMatchingCollections') : t('collection.noCollections')
            }}
          </h3>
          <p class="text-gray-500">
            {{
              searchQuery
                ? t('collection.tryDifferentSearch')
                : t('collection.noCollectionsInCategory')
            }}
          </p>
        </div>
        <div v-else class="h-full">
          <div class="flex h-full gap-2">
            <div class="flex-1 overflow-y-auto pr-2">
              <div
                v-for="item in filteredCollections"
                :key="item.id"
                class="border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer group mb-4"
                @click="onCollectionClick(item)"
              >
                <div class="p-6">
                  <h3
                    class="text-lg font-semibold text-black mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors"
                  >
                    <!-- Collection #{{ item.id }} -->
                    {{ decodeHtmlEntities(item.details.title) }}
                  </h3>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px">
                    <span
                      v-for="(tag, index) in item.tags"
                      :key="tag.id"
                      :index="index"
                      class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium"
                    >
                      {{ tag }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <div>
                      <div>
                        {{ t('collection.createdAt', { date: formatDate(item.created_at) }) }}
                      </div>
                    </div>
                    <button
                      @click.stop="showPublishModal(item.id)"
                      class="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center"
                    >
                      <MessageSquareShare class="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div
                    v-if="item.details && item.details.attachment"
                    class="mt-4 pt-4 border-t border-gray-100"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-500 truncate">{{
                        t('collection.attachmentId', { id: item.details.attachment })
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <transition name="slide-panel" mode="out-in">
              <div
                v-if="selectedCollection || showAskAIPanel"
                class="w-2/5 border border-gray-200 rounded-lg bg-white flex flex-col h-full"
              >
                <div class="flex items-center justify-between p-4 flex-shrink-0">
                  <div class="flex items-center gap-2">
                    <Sparkles class="w-6 h-6" fill="#4577e5" style="color: #4577e5" />
                    <h1 class="text-2xl font-semibold text-black">
                      {{ showAskAIPanel ? t('collection.askAI') : t('collection.aiOverview') }}
                    </h1>
                  </div>

                  <!-- 关闭 -->
                  <button
                    @click="
                      selectedCollection = null
                      showAskAIPanel = false
                    "
                    class="text-gray-500 hover:text-gray-700 focus:outline-none"
                    :title="t('collection.close')"
                  >
                    <svg
                      class="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- Collection AI Overview -->
                <transition name="fade-content" mode="out-in">
                  <div
                    v-if="selectedCollection && !showAskAIPanel"
                    key="overview"
                    class="p-4 flex-1 overflow-y-auto"
                  >
                    <p>{{ decodeHtmlEntities(selectedCollection?.details?.summary) }}</p>
                  </div>

                  <!-- Ask AI Panel -->
                  <div
                    v-else-if="showAskAIPanel"
                    key="askAI"
                    class="flex flex-col"
                    style="height: 100%"
                  >
                    <div v-if="aiResponse" class="flex-1 p-4 m-4 rounded-lg overflow-y-auto">
                      <div class="text-gray-700 prose" v-html="renderedAiResponse"></div>
                    </div>
                    <div v-else class="flex-1 p-4 flex items-center justify-center text-gray-500">
                      {{ t('collection.askAnything') }}
                    </div>

                    <div class="p-4 flex-shrink-0">
                      <div class="border border-gray-300 rounded-2xl">
                        <textarea
                          id="input-field"
                          v-model="aiQuery"
                          @keydown="handleInputKeyDown"
                          @click:clear="clearMessage"
                          :placeholder="t('collection.askAIPlaceholder')"
                          class="w-full resize-none outline-none border-none rounded-t-2xl p-4 min-h-[60px] font-inherit text-base bg-transparent"
                        ></textarea>
                        <div class="flex justify-between items-center px-2 pb-2">
                          <div></div>
                          <button
                            @click="askAI"
                            :disabled="!aiQuery.trim() || aiLoading"
                            :class="['send-button', { disabled: !aiQuery.trim() || aiLoading }]"
                            class="flex justify-center items-center bg-black rounded-full p-2 border-none cursor-pointer transition-all duration-200"
                          >
                            <ArrowUp v-if="!aiLoading" :size="16" style="color: #fff" />
                            <svg
                              v-else
                              class="animate-spin"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                class="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="white"
                                stroke-width="4"
                              ></circle>
                              <path
                                class="opacity-75"
                                fill="white"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </main>

    <!-- 发布到社区模态框 -->
    <PublishToCommunityModal
      :show="publishModalShow"
      :collection-id="selectedCollectionId"
      @close="publishModalShow = false"
      @success="handlePublishSuccess"
    />

    <!-- Ask AI 模态框 - 已移除，现在使用卡片显示 -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getCollectionsByCategory } from '@/api'
import { createKnowledgeBase as apiCreateKnowledgeBase, queryKnowledgeBase } from '@/api'
import { isAuthenticated } from '@/api'
import PublishToCommunityModal from '../components/PublishToCommunityModal.vue'
import { Sparkle } from 'lucide-vue-next'
import { Sparkles } from 'lucide-vue-next'
import { ArrowUp } from 'lucide-vue-next'
import { MessageSquareShare } from 'lucide-vue-next'
import { marked } from 'marked'

const { t } = useI18n()
const BookmarkIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`
}

const SearchIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`
}

// 解码HTML实体
const decodeHtmlEntities = (text) => {
  if (!text) return ''
  const parser = new DOMParser()
  const decodedString = parser.parseFromString(`<!doctype html><body>${text}</body>`, 'text/html')
    .body.textContent
  return decodedString
}

// 路由参数
const route = useRoute()
const router = useRouter()
const categoryId = route.params.category_id

const collections = ref([])
const category = ref(null)
const loading = ref(false)
const publishModalShow = ref(false)
const selectedCollectionId = ref(null)
const showAskAIPanel = ref(false)
const aiQuery = ref('')
const aiResponse = ref('')
const aiLoading = ref(false)
const selectedCollection = ref(null)
const searchQuery = ref('')
const filteredCollections = ref([])
const creatingKnowledgeBase = ref(false)

const fetchCollectionsByCategory = async () => {
  // 检查用户是否已登录
  if (!isAuthenticated()) {
    console.log('用户未登录，跳转到登录页面')
    router.push('/login')
    return
  }

  loading.value = true
  try {
    const result = await getCollectionsByCategory(categoryId)

    if (!result?.collections) {
      collections.value = []
      filteredCollections.value = []
      return
    }

    let collectionsData = result.collections || []
    // 将 tag 转成数组
    collectionsData = collectionsData.map((item) => ({
      ...item,
      tags: item.tags ? item.tags.split(',').map((tag) => tag.trim()) : []
    }))
    collections.value = collectionsData
    filteredCollections.value = collectionsData // 初始化过滤列表
    category.value = result.category
  } catch (e) {
    collections.value = []
    filteredCollections.value = []
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
  fetchCollectionsByCategory()
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

const showPublishModal = (collectionId) => {
  selectedCollectionId.value = collectionId
  publishModalShow.value = true
}

const handlePublishSuccess = (result) => {
  console.log('发布成功:', result)
  // 不再弹窗提示，直接由模态框内部提示
  // alert('已成功发布到社区！')
}

const createKnowledgeBase = async () => {
  if (!categoryId || creatingKnowledgeBase.value) return

  try {
    creatingKnowledgeBase.value = true
    await apiCreateKnowledgeBase(categoryId)
    // 知识库创建已启动，后台处理
    alert('知识库创建已启动，请稍后刷新页面查看状态。请不要重复点击')
    // 可以添加一个定时器来检查状态，但暂时使用alert
  } catch (error) {
    console.error('创建知识库失败:', error)
    alert('创建知识库失败: ' + (error.detail || error.message || '未知错误'))
  } finally {
    creatingKnowledgeBase.value = false
  }
}

const onCollectionClick = (collection) => {
  // router.push({ name: 'CollectionDetail', params: { collection_id: collectionId } })
  selectedCollection.value = collection
  showAskAIPanel.value = false // 关闭 Ask AI 面板
}

const askAI = async () => {
  if (!aiQuery.value.trim() || !categoryId) return

  try {
    aiLoading.value = true
    aiResponse.value = ''

    const result = await queryKnowledgeBase(categoryId, aiQuery.value)

    // 更详细的响应检查
    console.log('AI查询结果:', result)

    if (!result) {
      console.warn('AI查询返回空结果')
      aiResponse.value = 'AI查询失败: 返回结果为空'
      return
    }

    // 检查后端返回的数据结构：result.data.response
    if (result.data && result.data.response) {
      aiResponse.value = result.data.response
    } else if (result.response) {
      // 兼容旧的数据结构
      aiResponse.value = result.response
    } else {
      aiResponse.value = 'AI返回了空响应，请重试。'
    }
  } catch (error) {
    console.error('AI查询失败:', error)

    // 更详细的错误处理
    let errorMessage = '未知错误'

    if (error.response) {
      // 服务器返回了错误状态码
      const status = error.response.status
      const data = error.response.data

      if (status === 404) {
        if (data?.detail?.includes('Knowledge base')) {
          errorMessage = '知识库不存在，请先创建知识库'
        } else if (data?.detail?.includes('Category')) {
          errorMessage = '分类不存在'
        } else {
          errorMessage = '请求的资源不存在'
        }
      } else if (status === 500) {
        errorMessage = '服务器内部错误，请稍后重试'
      } else if (status === 401 || status === 403) {
        errorMessage = '认证失败，请重新登录'
      } else if (data && data.detail) {
        errorMessage = data.detail
      } else if (data && data.message) {
        errorMessage = data.message
      } else {
        errorMessage = `HTTP ${status} 错误`
      }
    } else if (error.request) {
      // 网络请求失败
      if (error.customMessage) {
        errorMessage = error.customMessage
      } else {
        errorMessage = '网络连接失败，请检查网络连接'
      }
    } else if (error.message) {
      if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，请稍后重试'
      } else {
        errorMessage = error.message
      }
    } else if (error.detail) {
      // 处理后端返回的错误信息
      errorMessage = error.detail
    }

    aiResponse.value = 'AI查询失败: ' + errorMessage
  } finally {
    aiLoading.value = false
  }
}

const handleInputKeyDown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    askAI()
  }
}

// 搜索功能
const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    filteredCollections.value = collections.value
    return
  }

  const query = searchQuery.value.toLowerCase()
  filteredCollections.value = collections.value.filter((item) => {
    // 搜索 ID
    if (item.id.toString().includes(query)) return true

    // 搜索标签
    if (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(query))) return true

    // 搜索创建时间
    if (formatDate(item.created_at).toLowerCase().includes(query)) return true

    // 搜索附件ID
    if (item.details?.attachment && item.details.attachment.toLowerCase().includes(query))
      return true

    return false
  })
}

const clearSearch = () => {
  searchQuery.value = ''
  filteredCollections.value = collections.value
}

// 计算属性：渲染AI响应的Markdown
const renderedAiResponse = computed(() => {
  return aiResponse.value ? marked(aiResponse.value) : ''
})
</script>

<style scoped>
/* 面板滑入/滑出动画 */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-panel-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-panel-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-panel-enter-to,
.slide-panel-leave-from {
  transform: translateX(0);
  opacity: 1;
}

/* 内容切换淡入/淡出动画 */
.fade-content-enter-active,
.fade-content-leave-active {
  transition: all 0.3s ease-in-out;
}

.fade-content-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-content-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-content-enter-to,
.fade-content-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.send-button {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.send-button:hover:not(.disabled) {
  background-color: #333 !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.send-button:active:not(.disabled) {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.send-button.disabled {
  background-color: #ccc !important;
  cursor: not-allowed !important;
  opacity: 0.6;
}

.send-button.disabled:hover {
  transform: none !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

/* 确保滚动条样式美观 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
