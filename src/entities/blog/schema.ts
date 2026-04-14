import { z } from 'zod'

export const GlossaryItemSchema = z.object({
  term: z.string().min(1),
  plainExplanation: z.string().min(1),
})

export const PublicationStateSchema = z.object({
  status: z.enum(['draft', 'ready', 'scheduled', 'published', 'failed']),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
  publishedAt: z.string().datetime({ offset: true }).optional(),
  externalPostId: z.string().optional(),
  externalUrl: z.string().url().optional(),
  lastError: z.string().optional(),
  attempts: z.number().int().min(0),
})

export const ChannelPostSchema = z.object({
  channel: z.enum(['site', 'telegram', 'max', 'vk']),
  format: z.enum(['full', 'social', 'short']),
  title: z.string().optional(),
  body: z.string().min(1, 'Текст поста не может быть пустым'),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  characterLimit: z.number().int().positive().optional(),
  requiresAdaptation: z.boolean(),
  copiedAt: z.string().datetime({ offset: true }).optional(),
  publication: PublicationStateSchema,
})

export const BlogPostSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(['regular', 'fun_fallback']),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().optional(),
  tags: z.array(z.string()),
  tone: z.enum(['light', 'ironic', 'neutral']).optional(),
  canonicalContent: z.string().min(1),
  glossary: z.array(GlossaryItemSchema).optional(),
  channels: z.object({
    site: ChannelPostSchema,
    telegram: ChannelPostSchema,
    max: ChannelPostSchema,
    vk: ChannelPostSchema,
  }),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

export type BlogPostInput = z.infer<typeof BlogPostSchema>
