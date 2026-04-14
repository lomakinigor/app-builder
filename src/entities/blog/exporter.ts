import type { BlogPost, ChannelName } from './types'

function postToMarkdown(post: BlogPost): string {
  const kindLabel = post.kind === 'fun_fallback' ? ' _(день без активности)_' : ''
  const lines: string[] = [
    `# ${post.date} — ${post.title}${kindLabel}`,
    '',
  ]

  if (post.summary) lines.push(`> ${post.summary}`, '')

  if (post.glossary?.length) {
    lines.push('**Термины:**')
    for (const item of post.glossary) {
      lines.push(`- **${item.term}** — ${item.plainExplanation}`)
    }
    lines.push('')
  }

  const channels: ChannelName[] = ['site', 'telegram', 'max', 'vk']
  for (const ch of channels) {
    const cp = post.channels[ch]
    lines.push(`[${ch}]`)
    if (cp.title && cp.title !== post.title) lines.push(`**${cp.title}**`)
    lines.push(cp.body)
    if (cp.hashtags?.length) lines.push(cp.hashtags.join(' '))
    lines.push('')
  }

  lines.push('---', '')
  return lines.join('\n')
}

/** Экспортирует все посты в строку Blog.md. Новые посты — сверху. */
export function exportBlogToMarkdown(posts: BlogPost[]): string {
  const header = [
    '# 📖 Blog.md — Дневник разработки',
    '',
    '> Этот файл создаётся автоматически. Каждый день здесь появляется новая запись.',
    '',
    '---',
    '',
  ].join('\n')

  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date))
  return header + sorted.map(postToMarkdown).join('\n')
}
