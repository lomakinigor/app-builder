// Blog entity types.
// These types are used both by the app-builder's Blog page and
// as a scaffold template emitted into every generated project.

export type ChannelName = 'site' | 'telegram' | 'max' | 'vk'
export type PostKind = 'regular' | 'fun_fallback'
export type PostStatus = 'draft' | 'ready' | 'scheduled' | 'published' | 'failed'

export interface GlossaryItem {
  term: string
  plainExplanation: string
}

export interface MediaRef {
  url: string
  type: 'image' | 'video'
  alt?: string
}

export interface PublicationState {
  status: PostStatus
  scheduledFor?: string
  publishedAt?: string
  externalPostId?: string
  externalUrl?: string
  lastError?: string
  attempts: number
}

export interface ChannelPost {
  channel: ChannelName
  format: 'full' | 'social' | 'short'
  title?: string
  body: string
  hashtags?: string[]
  mentions?: string[]
  media?: MediaRef[]
  characterLimit?: number
  requiresAdaptation: boolean
  copiedAt?: string
  publication: PublicationState
}

export interface BlogPost {
  id: string
  date: string             // YYYY-MM-DD
  kind: PostKind
  title: string
  slug: string
  summary?: string
  tags: string[]
  tone?: 'light' | 'ironic' | 'neutral'
  canonicalContent: string
  glossary?: GlossaryItem[]
  channels: Record<ChannelName, ChannelPost>
  createdAt: string
  updatedAt: string
}
