import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types'

// 从环境变量中获取 API 基础 URL
const envBaseURL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_API_BASE_URL_PROD
    : import.meta.env.VITE_API_BASE_URL_DEV

export const baseURL: string = typeof envBaseURL === 'string' ? envBaseURL : 'http://localhost:8000'

const api = axios.create({
  baseURL: baseURL,
  timeout: 60000, // 增加超时时间到60秒，因为AI查询可能需要更长时间
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // 从 localStorage 中获取 token
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log('请求URL:', (config.baseURL ?? '') + config.url)
    return config
  },
  (error: any) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>): any => {
    return response.data
  },
  (error: any) => {
    // 统一错误处理
    if (error.response) {
      // 服务器返回了错误状态码
      const status: number = error.response.status

      switch (status) {
        case 401:
          // 未授权，清除本地存储的 token 并跳转到登录页
          localStorage.removeItem('access_token')
          localStorage.removeItem('user_info')
          // 这里不直接操作路由，让组件层处理重定向
          break
        case 403:
          console.error('权限不足')
          break
        case 404:
          console.error('请求的资源不存在，请重试')
          break
        case 500:
          console.error('服务器内部错误')
          break
        default:
          console.error(`请求错误: ${status}`)
      }

      return Promise.reject(error.response.data || error.response)
    } else if (error.request) {
      // 网络错误
      console.error('网络错误，请检查网络连接')
      return Promise.reject(new Error('网络错误，请检查网络连接'))
    } else {
      // 其他错误
      console.error('请求配置错误:', error.message)
      return Promise.reject(error)
    }
  }
)

export default api
