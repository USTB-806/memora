import api from './api'
import type { ApiResponse, Attachment } from '@/types'
import { updateUserProfileApi } from './auth.api'

// 上传附件
export const uploadAttachmentApi = async (formData: FormData) => {
  const response: ApiResponse<Attachment> = await api.post(
    '/api/v1/attachments/upload/',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  )
  return response
}

// 获取附件信息
export const getAttachmentApi = async (attachmentId: string | number) => {
  const response: ApiResponse<Attachment> = await api.get(`/api/v1/attachments/${attachmentId}`)
  return response
}

// 获取附件文件 /api/v1/attachments/file/{attachment_id}
export const getAttachmentFileApi = async (attachmentId: string | number): Promise<Blob> => {
  const response: Blob = await api.get(`/api/v1/attachments/file/${attachmentId}`, {
    responseType: 'blob' // 以二进制流的形式获取文件
  })
  return response
}

// 删除附件
export const deleteAttachmentApi = async (attachmentId: string | number) => {
  const response: null = await api.delete(`/api/v1/attachments/${attachmentId}`)
  return response
}

// 上传附件 (服务层)
export const uploadAttachment = async (
  file: File,
  description: string | null = null
): Promise<Attachment> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (description) {
      formData.append('description', description)
    }

    const response = await uploadAttachmentApi(formData)

    if (response.code !== 200) {
      throw new Error(response.message || '上传附件失败')
    }

    return response.data
  } catch (error) {
    const err = error as any
    throw err.response?.data || err.message
  }
}

// 获取附件信息 (服务层)
export const getAttachment = async (attachmentId: string | number): Promise<Attachment> => {
  try {
    const response = await getAttachmentApi(attachmentId)

    if (response.code !== 200) {
      throw new Error(response.message || '获取附件信息失败')
    }

    return response.data
  } catch (error) {
    const err = error as any
    throw err.response?.data || err.message
  }
}

// 获取附件文件 (服务层)
export const getAttachmentFile = async (attachmentId: string | number): Promise<void> => {
  try {
    const response = await getAttachmentFileApi(attachmentId)
    const fileBlob = new Blob([response], { type: 'application/octet-stream' })
    const fileURL = URL.createObjectURL(fileBlob)
    const link = document.createElement('a')
    link.href = fileURL
    link.download = '' // Let the browser decide the filename
    link.click()
    URL.revokeObjectURL(fileURL)
  } catch (error) {
    const err = error as any
    throw err.response?.data || err.message
  }
}

// 删除附件 (服务层)
export const deleteAttachment = async (attachmentId: string | number): Promise<any> => {
  try {
    await deleteAttachmentApi(attachmentId)
    return null
  } catch (error) {
    const err = error as any
    throw err.response?.data || err.message
  }
}

// 上传用户头像 (服务层)
export const uploadAvatar = async (file: File): Promise<any> => {
  try {
    // 验证上传文件类型
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

    // 验证上传文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('文件大小不能超过 10MB')
    }

    // 上传头像
    const attachment = await uploadAttachment(file, 'avatar')

    // 更新用户头像信息
    const attachmentData = attachment

    const response = await updateUserProfileApi({
      avatar_attachment_id: attachmentData.attachment_id
    })

    return response.data
  } catch (error) {
    const err = error as any
    throw err.response?.data || err.message
  }
}
