<template>
  <div class="h-full bg-muted overflow-y-auto relative">
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

    <!-- 设置内容 -->
    <div class="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 relative z-20">
      <h1 class="text-3xl font-bold text-accent-text mb-8">{{ t('settings.title') }}</h1>

      <!-- 语言设置 -->
      <div class="bg-primary rounded-lg shadow-primary p-6 mb-6">
        <h2 class="text-xl font-semibold text-accent-text mb-4">{{ t('settings.language') }}</h2>
        <div class="space-y-3">
          <div class="flex items-center">
            <input
              id="en"
              v-model="selectedLanguage"
              type="radio"
              :value="'en'"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-muted-border"
              @change="changeLanguage"
            />
            <label for="en" class="ml-3 block text-sm font-medium text-primary-text">
              English
            </label>
          </div>
          <div class="flex items-center">
            <input
              id="zh"
              v-model="selectedLanguage"
              type="radio"
              :value="'zh'"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-muted-border"
              @change="changeLanguage"
            />
            <label for="zh" class="ml-3 block text-sm font-medium text-primary-text"> 中文 </label>
          </div>
        </div>
      </div>

      <!-- 应用模式设置 -->
      <div class="bg-primary rounded-lg shadow-primary p-6 mb-6">
        <h2 class="text-xl font-semibold text-accent-text mb-4">{{ t('settings.mode.title') }}</h2>
        <div class="space-y-3">
          <div class="flex items-center">
            <input
              id="normal"
              v-model="selectedMode"
              type="radio"
              :value="'normal'"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-muted-border"
              @change="changeMode"
            />
            <label for="normal" class="ml-3 block text-sm font-medium text-primary-text">
              {{ t('settings.mode.normal') }}
            </label>
          </div>
          <p class="ml-7 text-xs text-muted-text">{{ t('settings.mode.normalDesc') }}</p>

          <div class="flex items-center">
            <input
              id="standalone"
              v-model="selectedMode"
              type="radio"
              :value="'standalone'"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-muted-border"
              @change="changeMode"
            />
            <label for="standalone" class="ml-3 block text-sm font-medium text-primary-text">
              {{ t('settings.mode.standalone') }}
            </label>
          </div>
          <p class="ml-7 text-xs text-muted-text">{{ t('settings.mode.standaloneDesc') }}</p>
        </div>
      </div>

      <!-- AI 配置 (仅在standalone模式下显示) -->
      <div v-if="isStandaloneMode" class="bg-primary rounded-lg shadow-primary p-6 mb-6">
        <h2 class="text-xl font-semibold text-accent-text mb-4">{{ t('settings.ai.title') }}</h2>

        <div class="space-y-4">
          <!-- AI 提供商选择 -->
          <div>
            <label class="block text-sm font-medium text-primary-text mb-2">
              {{ t('settings.ai.provider') }}
            </label>
            <select
              v-model="aiProvider"
              class="w-full px-3 py-2 border border-muted-border rounded-md bg-primary text-primary-text focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="openai">{{ t('settings.ai.providers.openai') }}</option>
              <option value="anthropic">{{ t('settings.ai.providers.anthropic') }}</option>
              <option value="ollama">{{ t('settings.ai.providers.ollama') }}</option>
              <option value="custom">{{ t('settings.ai.providers.custom') }}</option>
            </select>
          </div>

          <!-- API Key -->
          <div>
            <label class="block text-sm font-medium text-primary-text mb-2">
              {{ t('settings.ai.apiKey') }}
            </label>
            <input
              v-model="apiKey"
              type="password"
              class="w-full px-3 py-2 border border-muted-border rounded-md bg-primary text-primary-text focus:outline-none focus:ring-2 focus:ring-accent"
              :placeholder="t('settings.ai.apiKeyPlaceholder')"
            />
          </div>

          <!-- Base URL (仅对自定义提供商显示) -->
          <div v-if="aiProvider === 'custom'">
            <label class="block text-sm font-medium text-primary-text mb-2">
              {{ t('settings.ai.baseUrl') }}
            </label>
            <input
              v-model="baseUrl"
              type="url"
              class="w-full px-3 py-2 border border-muted-border rounded-md bg-primary text-primary-text focus:outline-none focus:ring-2 focus:ring-accent"
              :placeholder="t('settings.ai.baseUrlPlaceholder')"
            />
          </div>

          <!-- 模型选择 -->
          <div>
            <label class="block text-sm font-medium text-primary-text mb-2">
              {{ t('settings.ai.model') }}
            </label>
            <input
              v-model="aiModel"
              type="text"
              class="w-full px-3 py-2 border border-muted-border rounded-md bg-primary text-primary-text focus:outline-none focus:ring-2 focus:ring-accent"
              :placeholder="t('settings.ai.modelPlaceholder')"
            />
          </div>

          <!-- 测试连接按钮 -->
          <div class="flex justify-end">
            <button
              @click="testAIConnection"
              :disabled="isTestingConnection"
              class="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isTestingConnection ? t('settings.ai.testing') : t('settings.ai.testConnection') }}
            </button>
          </div>

          <!-- 连接状态 -->
          <div v-if="connectionStatus" class="text-sm" :class="connectionStatus.success ? 'text-green-600' : 'text-red-600'">
            {{ connectionStatus.message }}
          </div>
        </div>
      </div>

      <!-- 数据迁移 (仅在standalone模式下显示) -->
      <div v-if="isStandaloneMode" class="bg-primary rounded-lg shadow-primary p-6 mb-6">
        <h2 class="text-xl font-semibold text-accent-text mb-4">{{ t('settings.migration.title') }}</h2>

        <div class="space-y-4">
          <!-- 迁移状态 -->
          <div class="bg-muted rounded-lg p-4">
            <h3 class="text-sm font-medium text-primary-text mb-2">{{ t('settings.migration.status') }}</h3>
            <div class="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span class="text-muted-text">{{ t('settings.migration.collections') }}:</span>
                <span class="text-primary-text ml-2">{{ migrationStatus.dataSize.localCollections }}</span>
              </div>
              <div>
                <span class="text-muted-text">{{ t('settings.migration.posts') }}:</span>
                <span class="text-primary-text ml-2">{{ migrationStatus.dataSize.localPosts }}</span>
              </div>
              <div>
                <span class="text-muted-text">{{ t('settings.migration.knowledge') }}:</span>
                <span class="text-primary-text ml-2">{{ migrationStatus.dataSize.localKnowledgeDocs }}</span>
              </div>
            </div>
          </div>

          <!-- 迁移选项 -->
          <div class="space-y-3">
            <div class="flex items-center">
              <input
                id="include-collections"
                v-model="migrationOptions.includeCollections"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-muted-border rounded"
              />
              <label for="include-collections" class="ml-3 block text-sm font-medium text-primary-text">
                {{ t('settings.migration.includeCollections') }}
              </label>
            </div>
            <div class="flex items-center">
              <input
                id="include-private"
                v-model="migrationOptions.includePrivatePosts"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-muted-border rounded"
              />
              <label for="include-private" class="ml-3 block text-sm font-medium text-primary-text">
                {{ t('settings.migration.includePrivatePosts') }}
              </label>
            </div>
            <div class="flex items-center">
              <input
                id="include-knowledge"
                v-model="migrationOptions.includeKnowledgeBase"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-muted-border rounded"
              />
              <label for="include-knowledge" class="ml-3 block text-sm font-medium text-primary-text">
                {{ t('settings.migration.includeKnowledgeBase') }}
              </label>
            </div>
          </div>

          <!-- 迁移按钮 -->
          <div class="flex justify-between">
            <button
              v-if="migrationStatus.canMigrateToNormal"
              @click="migrateToNormal"
              :disabled="isMigrating"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isMigrating ? t('settings.migration.migrating') : t('settings.migration.toNormal') }}
            </button>
            <button
              v-if="migrationStatus.canMigrateToStandalone"
              @click="migrateToStandalone"
              :disabled="isMigrating"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isMigrating ? t('settings.migration.migrating') : t('settings.migration.toStandalone') }}
            </button>
          </div>

          <!-- 迁移结果 -->
          <div v-if="migrationResult" class="text-sm">
            <div :class="migrationResult.success ? 'text-green-600' : 'text-red-600'">
              {{ migrationResult.success ? t('settings.migration.success') : t('settings.migration.failed') }}
            </div>
            <div class="mt-2 text-xs text-muted-text">
              <div>{{ t('settings.migration.migratedItems') }}:</div>
              <ul class="ml-4 mt-1">
                <li>{{ t('settings.migration.collections') }}: {{ migrationResult.migratedItems.collections }}</li>
                <li>{{ t('settings.migration.posts') }}: {{ migrationResult.migratedItems.posts }}</li>
                <li>{{ t('settings.migration.knowledge') }}: {{ migrationResult.migratedItems.knowledgeDocuments }}</li>
              </ul>
            </div>
            <div v-if="migrationResult.errors.length > 0" class="mt-2 text-xs text-red-600">
              <div>{{ t('settings.migration.errors') }}:</div>
              <ul class="ml-4 mt-1">
                <li v-for="error in migrationResult.errors" :key="error">{{ error }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppMode } from '@/composables/useAppMode'
import { dataMigration } from '@/services/dataMigration.service'

const { t, locale } = useI18n()
const { currentMode, setMode, initializeMode, isStandalone } = useAppMode()

const selectedLanguage = ref(locale.value)
const selectedMode = ref(currentMode.value)

// AI 配置相关
const aiProvider = ref('openai')
const apiKey = ref('')
const baseUrl = ref('')
const aiModel = ref('gpt-4')
const isTestingConnection = ref(false)
const connectionStatus = ref(null)

// 数据迁移相关
const migrationStatus = ref({
  canMigrateToStandalone: false,
  canMigrateToNormal: false,
  dataSize: {
    localCollections: 0,
    localPosts: 0,
    localKnowledgeDocs: 0
  }
})
const migrationOptions = ref({
  includeCollections: true,
  includePrivatePosts: true,
  includeKnowledgeBase: true
})
const isMigrating = ref(false)
const migrationResult = ref(null)

// 计算属性
const isStandaloneMode = computed(() => isStandalone.value)

// 可用模型列表
const availableModels = computed(() => {
  const models = {
    openai: [
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    anthropic: [
      { value: 'claude-3-opus', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
    ],
    ollama: [
      { value: 'llama2', label: 'Llama 2' },
      { value: 'codellama', label: 'Code Llama' },
      { value: 'mistral', label: 'Mistral' }
    ],
    custom: [
      { value: 'custom-model', label: 'Custom Model' }
    ]
  }
  return models[aiProvider.value] || models.openai
})

const changeLanguage = () => {
  locale.value = selectedLanguage.value
  localStorage.setItem('language', selectedLanguage.value)
}

const changeMode = () => {
  setMode(selectedMode.value)
  // 这里可以添加模式切换的逻辑，比如重新加载应用或通知其他组件
  console.log('App mode changed to:', selectedMode.value)
}

// 测试AI连接
const testAIConnection = async () => {
  if (!apiKey.value) {
    connectionStatus.value = { success: false, message: t('settings.ai.errors.noApiKey') }
    return
  }

  if (!aiModel.value.trim()) {
    connectionStatus.value = { success: false, message: '请输入模型名称' }
    return
  }

  if (aiProvider.value === 'custom' && !baseUrl.value.trim()) {
    connectionStatus.value = { success: false, message: '自定义提供商需要输入Base URL' }
    return
  }

  isTestingConnection.value = true
  connectionStatus.value = null

  try {
    const config = {
      provider: aiProvider.value,
      apiKey: apiKey.value,
      baseURL: baseUrl.value || undefined,
      model: aiModel.value.trim()
    }

    const result = await window.api.ai.configure(config)
    if (result.success) {
      // 测试一个简单的聊天请求
      const testResult = await window.api.ai.chat([
        { role: 'user', content: 'Hello, this is a test message.' }
      ])

      if (testResult.success) {
        connectionStatus.value = { success: true, message: t('settings.ai.success') }
        // 保存配置到本地存储
        saveAIConfig()
      } else {
        connectionStatus.value = { success: false, message: testResult.error || t('settings.ai.errors.testFailed') }
      }
    } else {
      connectionStatus.value = { success: false, message: result.error || t('settings.ai.errors.configFailed') }
    }
  } catch (error) {
    connectionStatus.value = { success: false, message: error.message || t('settings.ai.errors.unknown') }
  } finally {
    isTestingConnection.value = false
  }
}

// 保存AI配置
const saveAIConfig = () => {
  const config = {
    provider: aiProvider.value,
    apiKey: apiKey.value,
    baseURL: baseUrl.value,
    model: aiModel.value
  }
  localStorage.setItem('aiConfig', JSON.stringify(config))
}

// 加载AI配置
const loadAIConfig = () => {
  const saved = localStorage.getItem('aiConfig')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      aiProvider.value = config.provider || 'openai'
      apiKey.value = config.apiKey || ''
      // 支持旧版本的baseUrl和新版本的baseURL
      baseUrl.value = config.baseURL || config.baseUrl || ''
      aiModel.value = config.model || 'gpt-4'
    } catch (error) {
      console.error('Failed to load AI config:', error)
    }
  }
}

onMounted(async () => {
  initializeMode()
  selectedMode.value = currentMode.value

  const savedLanguage = localStorage.getItem('language')
  if (savedLanguage) {
    selectedLanguage.value = savedLanguage
    locale.value = savedLanguage
  }

  // 加载AI配置
  loadAIConfig()

  // 检查数据迁移状态
  await checkMigrationStatus()
})

// 数据迁移相关方法
const checkMigrationStatus = async () => {
  try {
    const status = await dataMigration.checkMigrationStatus()
    migrationStatus.value = status
  } catch (error) {
    console.error('Failed to check migration status:', error)
  }
}

const migrateToStandalone = async () => {
  isMigrating.value = true
  migrationResult.value = null

  try {
    const options = {
      direction: 'to-standalone',
      ...migrationOptions.value
    }
    const result = await dataMigration.migrate(options)
    migrationResult.value = result

    if (result.success) {
      // 重新检查迁移状态
      await checkMigrationStatus()
    }
  } catch (error) {
    migrationResult.value = {
      success: false,
      migratedItems: {
        users: 0,
        collections: 0,
        posts: 0,
        comments: 0,
        knowledgeDocuments: 0
      },
      errors: [`Migration failed: ${error}`]
    }
  } finally {
    isMigrating.value = false
  }
}

const migrateToNormal = async () => {
  isMigrating.value = true
  migrationResult.value = null

  try {
    const options = {
      direction: 'to-normal',
      ...migrationOptions.value
    }
    const result = await dataMigration.migrate(options)
    migrationResult.value = result

    if (result.success) {
      // 重新检查迁移状态
      await checkMigrationStatus()
    }
  } catch (error) {
    migrationResult.value = {
      success: false,
      migratedItems: {
        users: 0,
        collections: 0,
        posts: 0,
        comments: 0,
        knowledgeDocuments: 0
      },
      errors: [`Migration failed: ${error}`]
    }
  } finally {
    isMigrating.value = false
  }
}
</script>

<style scoped>
.particles-container {
  position: absolute;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: float 10s infinite linear;
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
    transform: translateY(-100vh) rotate(360deg);
    opacity: 0;
  }
}

.geometric-shapes {
  position: absolute;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  opacity: 0.05;
  animation: rotate 20s infinite linear;
}

.shape-circle {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  top: 10%;
  left: 10%;
}

.shape-square {
  width: 150px;
  height: 150px;
  background: linear-gradient(45deg, #10b981, #3b82f6);
  top: 60%;
  right: 10%;
  transform: rotate(45deg);
}

.shape-triangle {
  width: 0;
  height: 0;
  border-left: 100px solid transparent;
  border-right: 100px solid transparent;
  border-bottom: 173px solid rgba(139, 92, 246, 0.1);
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
