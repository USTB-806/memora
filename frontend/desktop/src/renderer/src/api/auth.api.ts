import api from './api'
import type { ApiResponse } from '@/types'
import { uploadAttachmentApi, getAttachmentApi } from './attachment.api'
import { baseURL } from './api'

// 用户注册
export const registerApi = async (userData: any): Promise<ApiResponse<any>> => {
  return await api.post('/api/v1/auth/register', userData)
}

// 用户登录
export const loginApi = async (credentials: any): Promise<ApiResponse<any>> => {
  return await api.post('/api/v1/auth/login', credentials)
}

// 获取用户信息
export const getUserProfileApi = async (): Promise<ApiResponse<any>> => {
  return await api.get('/api/v1/auth/profile')
}

// 更新用户信息
export const updateUserProfileApi = async (userData: any): Promise<ApiResponse<any>> => {
  return await api.put('/api/v1/auth/profile', userData)
}

// 用户注册 (服务层)
export const register = async (userData: any): Promise<any> => {
  try {
    const response = await registerApi(userData)

    if (response.code !== 200) {
      throw new Error(response.message || '注册失败')
    }

    return response.data
  } catch (error) {
    const err = error as any
    throw err.response?.data || err.message
  }
}

// 用户登录 (服务层)
export const login = async (credentials: any): Promise<any> => {
  try {
    const response = await loginApi(credentials)

    if (response.code !== 200) {
      throw new Error(response.message || '登录失败')
    }

    return response.data
  } catch (error) {
    const err = error as any
    throw err.response?.data || err.message
  }
}

// 获取用户信息 (服务层)
export const getUserProfile = async (): Promise<any> => {
  try {
    const response = await getUserProfileApi()

    if (response.code !== 200) {
      throw new Error(response.message || '获取用户信息失败')
    }

    return response.data
  } catch (error) {
    const err = error as any
    throw err.response?.data || err.message
  }
}

// 更新用户信息 (服务层)
export const updateUserProfile = async (userData: any): Promise<any> => {
  try {
    const response = await updateUserProfileApi(userData)

    if (response.code !== 200) {
      throw new Error(response.message || '更新用户信息失败')
    }

    return response.data
  } catch (error) {
    const err = error as any
    throw err.response?.data || err.message
  }
}

// 上传头像 (服务层)
export const uploadUserAvatar = async (file: File): Promise<any> => {
  try {
    // 验证文件类型
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp'
    ]
    if (!allowedTypes.includes(file.type)) {
      throw new Error('不支持的文件类型，请上传 JPG、PNG、GIF、WebP 或 BMP 格式的图片')
    }

    // 验证文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('文件大小不能超过 10MB')
    }

    // 创建 FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('description', 'avatar')

    // 上传头像
    const uploadResponse = await uploadAttachmentApi(formData)

    if (uploadResponse.code !== 200) {
      throw new Error(uploadResponse.message || '上传头像失败')
    }

    const attachment = uploadResponse.data

    // 更新用户头像信息
    const updateData = {
      avatar_attachment_id: attachment.attachment_id
    }

    const response = await updateUserProfileApi(updateData)

    if (response.code !== 200) {
      throw new Error(response.message || '更新用户信息失败')
    }

    return response.data
  } catch (error) {
    const err = error as any
    throw err.response?.data || err.message
  }
}

// 获取用户头像URL (服务层)
export const getUserAvatarUrl = async (userInfo: any): Promise<string | null> => {
  if (!userInfo || !userInfo.avatar_attachment_id) {
    return null
  }

  try {
    const response = await getAttachmentApi(userInfo.avatar_attachment_id)

    if (response.code !== 200) {
      throw new Error(response.message || '获取头像URL失败')
    }

    const attachment = response.data
    // Concatenate base URL with the relative path from attachment.url for absolute URL
    return `${baseURL}/${attachment.url.replace(/\\/g, '/')}`
  } catch (error) {
    console.error('获取头像URL失败:', error)
    return null
  }
}

// 直接构造头像URL (服务层)
export const buildAvatarUrl = async (
  avatarAttachmentId: string | number
): Promise<string | null> => {
  if (!avatarAttachmentId) {
    return null
  }
  try {
    const response = await getAttachmentApi(avatarAttachmentId)

    if (response.code !== 200) {
      throw new Error(response.message || '获取头像URL失败')
    }

    const attachment = response.data
    // Concatenate base URL with the relative path from attachment.url for absolute URL
    return `${baseURL}/${attachment.url.replace(/\\/g, '/')}`
  } catch (error) {
    console.error('构建头像URL失败:', error)
    return null
  }
}

// 登出
export const logout = (): void => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('user_info')
}

// 检查是否已登录
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('access_token')
  console.log('检查认证状态:', token ? '有token' : '无token')
  return !!token
}

// 获取本地存储的用户信息
export const getLocalUserInfo = (): any => {
  const userInfo = localStorage.getItem('user_info')
  return userInfo ? JSON.parse(userInfo) : null
}

// 强制刷新认证状态 (用于调试)
export const refreshAuthStatus = (): boolean => {
  const token = localStorage.getItem('access_token')
  const userInfo = localStorage.getItem('user_info')
  console.log('当前认证状态:', {
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : null,
    hasUserInfo: !!userInfo
  })
  return !!token
}
