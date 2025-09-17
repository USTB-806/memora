<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-inverse bg-opacity-50 flex items-center justify-center"
    style="z-index: 9999"
    @click.self="closeModal"
  >
    <div class="bg-primary rounded-lg shadow-lg max-w-md w-full mx-4">
      <!-- 模态框头部 -->

      <div class="flex items-center justify-between p-6 border-b border-muted-border">
        <h3 class="text-lg font-semibold text-accent-text">
          {{ t('community.publishToCommunity') }}
        </h3>
        <button
          class="text-primary-text hover:text-primary-text transition-colors"
          @click="closeModal"
        >
          <XIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- 模态框内容 -->
      <div class="p-6">
        <!-- 成功提示 -->
        <div v-if="successMessage" class="mb-4 text-green-600 text-center font-semibold">
          {{ successMessage }}
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-primary-text mb-2">
            {{ t('community.shareDescription') }}
          </label>
          <textarea
            v-model="description"
            :placeholder="t('community.sharePlaceholder')"
            class="w-full p-3 border border-muted-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="4"
            maxlength="500"
          ></textarea>

          <div class="text-xs text-primary-text mt-1 text-right">{{ description.length }}/500</div>
        </div>
      </div>

      <!-- 模态框底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-muted-border">
        <button
          class="px-4 py-2 bg-primary text-accent-text border border-accent-border rounded-lg hover:bg-muted transition-colors font-medium"
          :disabled="loading"
          @click="closeModal"
        >
          {{ t('community.cancel') }}
        </button>
        <button
          :disabled="loading"
          class="px-4 py-2 bg-inverse text-muted-text rounded-lg hover:bg-accent transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          @click="handlePublish"
        >
          <span
            v-if="loading"
            class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></span>
          {{ loading ? t('community.publishing') : t('community.publish') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { X as XIcon } from 'lucide-vue-next'
import { createPost } from '@/api'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  collectionId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['close', 'success'])

const description = ref('')
const loading = ref(false)
const successMessage = ref('')

// 监听模态框显示状态，重置表单和提示
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      description.value = ''
      loading.value = false
      successMessage.value = ''
    }
  }
)

const closeModal = () => {
  if (!loading.value) {
    emit('close')
  }
}

const handlePublish = async () => {
  if (loading.value) return

  try {
    loading.value = true

    const result = await createPost(props.collectionId, description.value.trim() || null)

    if (result) {
      emit('success', result)
      successMessage.value = t('community.publishSuccess')
      // 保持 loading 为 true，禁止再次点击
      setTimeout(() => {
        loading.value = false
        closeModal()
      }, 1500)
      return // 不再执行 finally 的 closeModal
    }
  } catch (error) {
    console.error('发布失败:', error)

    // 显示错误提示
    let errorMessage = t('community.publishFailed')
    if (error.detail) {
      errorMessage = error.detail
    } else if (error.message) {
      errorMessage = error.message
    }

    alert(errorMessage) // 简单的错误提示，可以替换为更好的提示组件
  } finally {
    // 只有未成功时才关闭和重置 loading
    if (!successMessage.value) {
      loading.value = false
      closeModal()
    }
  }
}
</script>

<style scoped>
/* 动画效果 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}
</style>
