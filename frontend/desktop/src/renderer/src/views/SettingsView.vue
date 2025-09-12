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

    <!-- 设置内容 -->
    <div class="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 relative z-20">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">{{ t('settings.title') }}</h1>

      <!-- 语言设置 -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">{{ t('settings.language') }}</h2>
        <div class="space-y-3">
          <div class="flex items-center">
            <input
              id="en"
              type="radio"
              :value="'en'"
              v-model="selectedLanguage"
              @change="changeLanguage"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label for="en" class="ml-3 block text-sm font-medium text-gray-700"> English </label>
          </div>
          <div class="flex items-center">
            <input
              id="zh"
              type="radio"
              :value="'zh'"
              v-model="selectedLanguage"
              @change="changeLanguage"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label for="zh" class="ml-3 block text-sm font-medium text-gray-700"> 中文 </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const selectedLanguage = ref(locale.value)

const changeLanguage = () => {
  locale.value = selectedLanguage.value
  localStorage.setItem('language', selectedLanguage.value)
}

onMounted(() => {
  const savedLanguage = localStorage.getItem('language')
  if (savedLanguage) {
    selectedLanguage.value = savedLanguage
    locale.value = savedLanguage
  }
})
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
  background: rgba(59, 130, 246, 0.3);
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
