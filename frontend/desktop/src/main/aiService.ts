import OpenAI from 'openai'
import { PROMPTS } from './prompts'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom'
  apiKey: string
  baseURL?: string
  model: string
  temperature?: number
  maxTokens?: number
}

export interface AIResponse {
  success: boolean
  content?: string
  error?: string
}

class AIService {
  private client: OpenAI | null = null
  private config: AIConfig | null = null

  configure(config: AIConfig) {
    this.config = config

    console.log('Configuring AI service with:', {
      provider: config.provider,
      baseURL: config.baseURL,
      model: config.model,
      hasApiKey: !!config.apiKey
    })

    // 验证配置
    if (!config.apiKey) {
      throw new Error('API key is required')
    }

    if (config.provider === 'custom' && !config.baseURL) {
      throw new Error('Custom provider requires a base URL')
    }

    // 根据提供商创建相应的客户端
    switch (config.provider) {
      case 'openai':
        this.client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL || 'https://api.openai.com/v1',
          dangerouslyAllowBrowser: false,
          timeout: 30000, // 30秒超时
        })
        break
      case 'custom':
        console.log('Setting up custom provider with baseURL:', config.baseURL)
        if (!config.baseURL) {
          throw new Error('Custom provider requires a valid base URL')
        }
        this.client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          dangerouslyAllowBrowser: false,
          timeout: 30000, // 30秒超时
        })
        break
      case 'anthropic':
        // 对于Anthropic，我们使用OpenAI兼容的API
        this.client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL || 'https://api.anthropic.com/v1',
          dangerouslyAllowBrowser: false,
          timeout: 30000, // 30秒超时
        })
        break
      case 'ollama':
        // 对于Ollama，使用本地API
        this.client = new OpenAI({
          apiKey: 'ollama', // Ollama不需要真实的API key
          baseURL: config.baseURL || 'http://localhost:11434/v1',
          dangerouslyAllowBrowser: false,
          timeout: 30000, // 30秒超时
        })
        break
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`)
    }
  }

  async chat(
    messages: AIMessage[],
    options: {
      temperature?: number
      maxTokens?: number
      systemPrompt?: string
    } = {}
  ): Promise<AIResponse> {
    if (!this.client || !this.config) {
      return {
        success: false,
        error: 'AI service not configured'
      }
    }

    console.log('Starting AI chat request:', {
      provider: this.config.provider,
      model: this.config.model,
      baseURL: this.config.baseURL,
      messageCount: messages.length,
      options
    })

    try {
      const chatMessages = [...messages]

      // 添加系统提示
      if (options.systemPrompt) {
        chatMessages.unshift({
          role: 'system',
          content: options.systemPrompt
        })
      }

      console.log('Sending request to AI API with messages:', chatMessages.map(m => ({ role: m.role, contentLength: m.content.length })))
      console.log('Request details:', {
        baseURL: this.config.baseURL,
        model: this.config.model,
        temperature: options.temperature || this.config.temperature || 0.7,
        maxTokens: options.maxTokens || this.config.maxTokens,
        messageCount: chatMessages.length
      })

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: chatMessages,
        temperature: options.temperature || this.config.temperature || 0.7,
        max_tokens: options.maxTokens || this.config.maxTokens
      })

      const content = response.choices[0]?.message?.content || ''

      console.log('AI API response received:', {
        success: true,
        contentLength: content.length,
        usage: response.usage
      })

      return {
        success: true,
        content
      }
    } catch (error) {
      console.error('AI chat error:', error)
      let errorMessage = 'Unknown AI error'

      if (error instanceof Error) {
        // 处理不同的错误类型
        if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          errorMessage = '连接超时，请检查网络连接或API端点'
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'API密钥无效或已过期'
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'API访问被拒绝，请检查权限'
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorMessage = '模型或端点不存在，请检查配置'
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = '请求频率过高，请稍后重试'
        } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
          errorMessage = '服务器错误，请稍后重试'
        } else if (error.message.includes('fetch')) {
          errorMessage = '网络连接失败，请检查网络设置'
        } else if (this.config?.provider === 'custom' && error.message.includes('baseURL')) {
          errorMessage = '自定义API端点配置错误，请检查Base URL格式'
        } else {
          errorMessage = error.message
        }
      }

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  async summarizeContent(content: string): Promise<AIResponse> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: content
      }
    ]

    return this.chat(messages, {
      systemPrompt: PROMPTS.SUMMARIZE_CONTENT
    })
  }

  async categorizeContent(content: string, categories: string[]): Promise<AIResponse> {
    const prompt = PROMPTS.PARSE_CATEGORY_AND_TAGS.replace('{categories}', categories.join(', '))

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: content
      }
    ]

    return this.chat(messages, {
      systemPrompt: prompt
    })
  }

  async queryKnowledgeBase(query: string, documents: string[]): Promise<AIResponse> {
    const context = documents.join('\n\n')
    const prompt = PROMPTS.KNOWLEDGE_BASE_QUERY.replace('{documents}', context)

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: query
      }
    ]

    return this.chat(messages, {
      systemPrompt: prompt
    })
  }

  isConfigured(): boolean {
    return this.client !== null && this.config !== null
  }

  getConfig(): AIConfig | null {
    return this.config
  }
}

// 导出单例实例
export const aiService = new AIService()