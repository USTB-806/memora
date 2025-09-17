// API Response Types
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// Auth Types
export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface UserProfile {
  id: number
  username: string
  email: string
  avatar_attachment_id: number | null
  created_at: string
  updated_at: string
}

export interface Token {
  access_token: string
  token_type: string
}

// Collection Types
export interface Collection {
  id: number
  category_id: number
  tags: string
  details: CollectionDetail[]
  created_at: string
  updated_at: string
}

export interface CollectionDetail {
  id: number
  key: string
  value: any
  created_at: string
  updated_at: string
}

// export interface CreateUrlCollectionData {
//   url: string
//   category: string
// }

export interface CreatePictureCollectionData {
  attachment_id: number
  category: string
}

// Attachment Types
export interface Attachment {
  id: string
  user_id: string
  url: string
  description: string | null
  created_at: string
}

// Category Types
export interface Category {
  id: number
  name: string
  user_id: number
  created_at: string
  updated_at: string
}

// Community Types
export interface CommunityPost {
  id: number
  title: string
  content: string
  author: string
  created_at: string
  updated_at: string
}

// Service Options
export interface ServiceOptions {
  batchSize?: number
  includeAttachmentDetails?: boolean
}

// Progress Callback
export type ProgressCallback = (status: string) => void

// Router Types
export interface RouteParams {
  [key: string]: string | number
}

// Component Props
export interface ModalProps {
  show: boolean
}

export interface NotificationState {
  show: boolean
  type: 'success' | 'error'
  title: string
  message: string
}
