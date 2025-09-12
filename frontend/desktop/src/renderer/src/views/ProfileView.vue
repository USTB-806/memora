<template>
  <div class="h-full bg-gray-50 overflow-y-auto relative">
    <!-- 背景动画 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div class="particles-container">
        <div
          v-for="i in 20"
          :key="i"
          class="particle"
          :style="{
            left: Math.random() * 100 + '%',
            animationDelay: Math.random() * 10 + 's',
            animationDuration: 8 + Math.random() * 4 + 's'
          }"
        ></div>
      </div>
      <div class="geometric-shapes">
        <div class="shape shape-circle"></div>
        <div class="shape shape-square"></div>
        <div class="shape shape-triangle"></div>
      </div>
    </div>

    <!-- 头像、信息、推文悬浮层 -->
    <div class="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 relative z-20">
      <div style="display: flex; gap: 24px; align-items: center; margin-bottom: 24px">
        <div class="relative">
          <div
            @click="triggerAvatarUpload"
            class="h-35 w-35 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="t('profile.avatar')"
              class="h-full w-full object-cover"
            />
            <User v-else class="h-10 w-10 text-gray-600" />
            <div
              v-if="avatarUploading"
              class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            >
              <RefreshCw class="h-6 w-6 text-white animate-spin" />
            </div>
          </div>
          <input
            ref="avatarInput"
            type="file"
            accept="image/*"
            @change="handleAvatarUpload"
            class="hidden"
          />
        </div>
        <div style="display: flex; justify-content: space-between" class="flex-1">
          <div style="display: flex; flex-direction: column; gap: 6px">
            <h2 class="text-3xl font-bold text-gray-900">{{ userInfo?.username }}</h2>
            <p class="text-gray-600">{{ userInfo?.email }}</p>
            <p class="text-sm text-gray-500">
              {{ t('profile.registrationTime', { date: formatDate(userInfo?.created_at) }) }}
            </p>
          </div>
          <div style="display: flex; justify-content: center; align-items: center">
            <button
              @click="showEdit"
              class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Edit3 class="h-4 w-4 mr-1" />
              {{ t('profile.edit') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 最近发布的推文展示（悬浮在最上层） -->
      <div class="mt-6 mb-8" style="margin-top: 105px">
        <h3 class="text-lg font-semibold text-gray-900 mb-3" style="margin-bottom: 30px">
          {{ t('profile.recentPosts') }}
        </h3>
        <div v-if="recentPostsLoading" class="py-6 flex justify-center text-gray-500">
          <RefreshCw class="h-5 w-5 animate-spin mr-2" /> {{ t('profile.loading') }}
        </div>
        <div v-else-if="recentPostsError" class="py-6 flex flex-col items-center text-red-500">
          <span>{{ recentPostsError }}</span>
          <button
            @click="loadRecentPosts"
            class="mt-2 px-4 py-1 bg-red-100 rounded hover:bg-red-200 text-sm text-red-700"
          >
            {{ t('profile.retry') }}
          </button>
        </div>
        <div v-else-if="recentPosts.length" class="space-y-3">
          <div
            v-for="post in recentPosts.slice(0, 2)"
            :key="post.id"
            class="p-4 rounded shadow transition cursor-pointer backdrop-blur-sm"
            style="
              margin-bottom: 20px;
              background-color: rgba(255, 255, 255, 0.9);
              border-radius: 15px;
            "
            @click="goToPost(post.id)"
          >
            <div class="flex flex-col gap-2">
              <!-- 分类/标签/发布时间 一行均匀分布 -->
              <div class="flex flex-row items-center justify-between gap-2 mb-1">
                <!-- 标签 -->
                <div class="flex items-center gap-1">
                  <!-- 分类 -->
                  <div class="flex items-center gap-1" style="margin-right: 10px">
                    <span class="text-xs font-bold text-gray-900">{{
                      post.category_name || t('profile.uncategorized')
                    }}</span>
                  </div>

                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="(tag, idx) in getTagList(post.tags)"
                      :key="idx"
                      class="px-2 py-0.5 text-gray-700 rounded text-xs hover:bg-gray-50"
                    >
                      #{{ tag }}
                    </span>
                    <span v-if="getTagList(post.tags).length === 0" class="text-xs text-gray-500">{{
                      t('profile.noTags')
                    }}</span>
                  </div>
                </div>
                <!-- 发布时间 -->
                <div class="flex items-center gap-1">
                  <span class="text-xs text-gray-500">{{ formatDate(post.created_at) }}</span>
                </div>
              </div>
              <!-- 摘要 -->
              <div class="text-sm text-gray-600 summary-ellipsis">
                {{ t('profile.summary', { text: getSummary(post.collection_details?.summary) }) }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-6 text-gray-400 text-sm text-center">{{ t('profile.noPosts') }}</div>
      </div>
    </div>

    <!-- 全局消息提示 -->
    <div v-if="editErrorMessage || editSuccessMessage" class="fixed top-4 right-4 z-50">
      <div
        v-if="editErrorMessage"
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg"
      >
        {{ editErrorMessage }}
      </div>
      <div
        v-if="editSuccessMessage"
        class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg"
      >
        {{ editSuccessMessage }}
      </div>
    </div>

    <!-- 编辑用户信息模态框 -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">{{ t('profile.editProfile') }}</h3>

          <form @submit.prevent="updateProfile" class="space-y-4">
            <div>
              <label for="edit-email" class="block text-sm font-medium text-gray-700">{{
                t('profile.email')
              }}</label>
              <input
                id="edit-email"
                type="email"
                v-model="editForm.email"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <!-- 错误提示 -->
            <div v-if="editErrorMessage" class="text-red-600 text-sm">
              {{ editErrorMessage }}
            </div>

            <!-- 成功提示 -->
            <div v-if="editSuccessMessage" class="text-green-600 text-sm">
              {{ editSuccessMessage }}
            </div>

            <div class="flex space-x-3">
              <button
                type="submit"
                :disabled="editLoading"
                class="flex-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <span v-if="editLoading">{{ t('profile.saving') }}</span>
                <span v-else>{{ t('profile.save') }}</span>
              </button>

              <button
                type="button"
                @click="cancelEdit"
                class="flex-1 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {{ t('profile.cancel') }}
              </button>
            </div>
          </form>

          <button
            @click="handleLogout"
            style="margin-top: 16px"
            class="w-full flex items-center justify-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <LogOut class="h-4 w-4 mr-2" />
            {{ t('profile.logout') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { User, Edit3, Star, Upload, Clock, RefreshCw, LogOut } from 'lucide-vue-next'
import {
  isAuthenticated,
  getLocalUserInfo,
  getUserProfile,
  updateUserProfile,
  logout,
  uploadUserAvatar,
  getUserAvatarUrl
} from '@/api'
import { getUserPosts } from '@/api' // 新增：引入获取用户推文API

const { t } = useI18n()
const router = useRouter()
const isLoggedIn = ref(false)
const userInfo = ref(null)
const loading = ref(false)
const showEditModal = ref(false)
const editLoading = ref(false)
const editErrorMessage = ref('')
const editSuccessMessage = ref('')
const avatarUrl = ref(null)
const avatarInput = ref(null)
const avatarUploading = ref(false)
const recentPosts = ref([])
const recentPostsLoading = ref(false)
const recentPostsError = ref('')

const editForm = reactive({
  email: ''
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '--'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 检查登录状态并获取用户信息
const checkAuthAndLoadUser = async () => {
  isLoggedIn.value = isAuthenticated()

  if (!isLoggedIn.value) {
    // 未登录直接跳转到登录页面
    router.push({ name: 'Login' })
    return
  }

  // 先从本地存储获取用户信息
  userInfo.value = getLocalUserInfo()

  // 加载头像
  await loadAvatar()

  // 然后从服务器刷新用户信息
  await refreshUserInfo()
}

// 刷新用户信息
const refreshUserInfo = async () => {
  loading.value = true
  try {
    const response = await getUserProfile()
    if (response) {
      userInfo.value = response
      // 刷新头像
      await loadAvatar()
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载头像
const loadAvatar = async () => {
  if (userInfo.value && userInfo.value.avatar_attachment_id) {
    try {
      avatarUrl.value = await getUserAvatarUrl(userInfo.value)
    } catch (error) {
      console.error('加载头像失败:', error)
    }
  }
}

// 显示编辑模态框
const showEdit = () => {
  editForm.email = userInfo.value?.email || ''
  editErrorMessage.value = ''
  editSuccessMessage.value = ''
  showEditModal.value = true
}

// 取消编辑
const cancelEdit = () => {
  showEditModal.value = false
  editErrorMessage.value = ''
  editSuccessMessage.value = ''
}

// 更新用户信息
const updateProfile = async () => {
  editLoading.value = true
  editErrorMessage.value = ''
  editSuccessMessage.value = ''

  try {
    const response = await updateUserProfile({
      email: editForm.email
    })

    if (response) {
      userInfo.value = response
      editSuccessMessage.value = '更新成功！'
      setTimeout(() => {
        showEditModal.value = false
      }, 1000)
    }
  } catch (error) {
    editErrorMessage.value = error.detail || error.message || '更新失败，请重试'
  } finally {
    editLoading.value = false
  }
}

// 触发头像上传
const triggerAvatarUpload = () => {
  if (avatarInput.value) {
    avatarInput.value.click()
  }
}

// 处理头像上传
const handleAvatarUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  avatarUploading.value = true

  try {
    const response = await uploadUserAvatar(file)
    if (response) {
      // 更新用户信息
      userInfo.value = response
      // 重新加载头像
      await loadAvatar()

      // 可以显示成功提示
      editSuccessMessage.value = '头像上传成功！'
      setTimeout(() => {
        editSuccessMessage.value = ''
      }, 3000)
    }
  } catch (error) {
    console.error('头像上传失败:', error)
    editErrorMessage.value = error.message || '头像上传失败，请重试'
    setTimeout(() => {
      editErrorMessage.value = ''
    }, 3000)
  } finally {
    avatarUploading.value = false
    // 清空文件选择
    if (avatarInput.value) {
      avatarInput.value.value = ''
    }
  }
}

// 获取最近发布的推文
const loadRecentPosts = async () => {
  recentPostsLoading.value = true
  recentPostsError.value = ''
  try {
    const res = await getUserPosts({ limit: 3 })
    if (res && res.posts) {
      recentPosts.value = res.posts
    } else {
      recentPostsError.value = '推文获取失败'
      recentPosts.value = []
    }
  } catch (e) {
    recentPostsError.value = e?.message || '网络错误，无法获取推文'
    recentPosts.value = []
  } finally {
    recentPostsLoading.value = false
  }
}

// 跳转到推文详情
const goToPost = (postId) => {
  router.push({ name: 'PostDetail', params: { post_id: postId } })
}

// 退出登录
const handleLogout = () => {
  logout()
  isLoggedIn.value = false
  userInfo.value = null
  router.push({ name: 'Home' })
}

// tag列表
const getTagList = (tags) => {
  if (!tags) return []
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag)
}

// 摘要解析（移植自PostCollectionDetailView）
const getSummary = (summary) => {
  if (!summary) return '无摘要'
  let cleanSummary = summary
  if (typeof cleanSummary === 'string') {
    cleanSummary = cleanSummary.trim()
    if (cleanSummary.startsWith('```') && cleanSummary.endsWith('```')) {
      cleanSummary = cleanSummary.slice(3, -3).trim()
    }
    try {
      if (cleanSummary.startsWith('{')) {
        const obj = JSON.parse(cleanSummary)
        if (obj && typeof obj === 'object' && obj.summary) return obj.summary
      }
      const match = cleanSummary.match(/"summary"\s*:\s*"([^"]+)"/)
      if (match && match[1]) return match[1]
      return cleanSummary
    } catch {
      const match = cleanSummary.match(/"summary"\s*:\s*"([^"]+)"/)
      if (match && match[1]) return match[1]
      return cleanSummary
    }
  }
  if (typeof cleanSummary === 'object' && cleanSummary.summary) return cleanSummary.summary
  return String(cleanSummary)
}

onMounted(() => {
  checkAuthAndLoadUser()
  loadRecentPosts()
})
</script>

<style scoped>
.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  animation: float linear infinite;
}

@keyframes float {
  0% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
    opacity: 0;
  }
}

.geometric-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  opacity: 0.08; /* 颜色加深：0.03 -> 0.08 */
}

.shape-circle {
  width: 200px;
  height: 200px;
  border: 2px solid #222; /* 颜色加深：#000 -> #222 */
  border-radius: 50%;
  top: 20%;
  right: 10%;
  animation: rotate 20s linear infinite;
}

.shape-square {
  width: 150px;
  height: 150px;
  border: 2px solid #222; /* 颜色加深：#000 -> #222 */
  top: 60%;
  left: 5%;
  animation: rotate 25s linear infinite reverse;
}

.shape-triangle {
  width: 0;
  height: 0;
  border-left: 75px solid transparent;
  border-right: 75px solid transparent;
  border-bottom: 130px solid rgba(34, 34, 34, 0.08); /* 颜色加深：rgba(0,0,0,0.03) -> rgba(34,34,34,0.08) */
  top: 40%;
  right: 20%;
  animation: float-shape 15s ease-in-out infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes float-shape {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

.summary-ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}
</style>
