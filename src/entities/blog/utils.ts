import type { BlogPost, ChannelName } from './types'

/** Проверяет, является ли дата будним днём (пн–пт) */
export function isWeekday(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

/**
 * Решает, какой пост создавать:
 * - 'regular'      — был прогресс
 * - 'fun_fallback' — будний день, но ничего не происходило
 * - 'skip'         — выходной день без активности
 */
export function shouldCreatePost(
  date: Date,
  activityCount: number
): 'regular' | 'fun_fallback' | 'skip' {
  if (activityCount > 0) return 'regular'
  if (isWeekday(date)) return 'fun_fallback'
  return 'skip'
}

/** Генерирует id поста из даты */
export function generatePostId(date: string): string {
  return `post_${date.replace(/-/g, '_')}`
}

/** Генерирует URL-безопасный slug из заголовка */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

/** Случайный шуточный заголовок для поста без активности */
export function getFunFallbackTitle(): string {
  const titles = [
    'Сегодня вайбкодер спал, а код решил его не будить',
    'Сегодня в проекте было тихо. Похоже, баги тоже взяли паузу',
    'Ничего не зарелизили, зато ничего и не сломали. Уже неплохо',
    'Сегодня приложение развивалось внутренне. Снаружи это выглядело как ничего',
    'День тишины: команда медитировала над кодом, но ничего не трогала',
    'Код сегодня отдыхал. Он заслужил',
  ]
  return titles[Math.floor(Math.random() * titles.length)]
}

/** Случайный шуточный текст для поста без активности по каналу */
export function getFunFallbackBody(channel: ChannelName): string {
  const bodies: Record<ChannelName, string[]> = {
    site: [
      'Сегодня в проекте не произошло ровным счётом ничего. Это бывает. Иногда лучший способ двигаться вперёд — выдохнуть и хорошенько выспаться. Вайбкодер сделал именно так. Завтра — обязательно что-нибудь сломаем и починим.',
      'День прошёл тихо. Код не менялся, баги не появлялись. Иногда такие дни нужны — они напоминают, что продукт уже работает и никуда не убежит.',
    ],
    telegram: [
      '😴 Сегодня тихий день. Вайбкодер спал, код отдыхал, баги не появлялись. Завтра наверстаем!',
      '🫠 Ничего не зарелизили. Зато ничего и не сломали — и это уже победа. До завтра!',
    ],
    max: [
      'Тихий день. Код отдыхает.',
      'Сегодня — ничего. Завтра — всё.',
    ],
    vk: [
      'Сегодня в проекте было тихо 😴 Вайбкодер спал, а программа решила не мешать. Завтра обязательно что-нибудь изменится!',
      'День без изменений — тоже день. Иногда нужно просто остановиться и выдохнуть 🤷 До завтра!',
    ],
  }
  const options = bodies[channel]
  return options[Math.floor(Math.random() * options.length)]
}

/** Создаёт пустую структуру ChannelPost для новых постов */
export function makeEmptyChannelPost(channel: ChannelName): import('./types').ChannelPost {
  const formatMap: Record<ChannelName, 'full' | 'social' | 'short'> = {
    site: 'full',
    telegram: 'social',
    max: 'short',
    vk: 'social',
  }
  const limitMap: Record<ChannelName, number | undefined> = {
    site: undefined,
    telegram: undefined,
    max: 300,
    vk: undefined,
  }
  return {
    channel,
    format: formatMap[channel],
    body: '',
    characterLimit: limitMap[channel],
    requiresAdaptation: channel !== 'site',
    publication: { status: 'draft', attempts: 0 },
  }
}

/** Создаёт новый BlogPost (fun_fallback) для текущего дня */
export function createFunFallbackPost(date: string): BlogPost {
  const title = getFunFallbackTitle()
  const now = new Date().toISOString()
  const channels = (['site', 'telegram', 'max', 'vk'] as ChannelName[]).reduce(
    (acc, ch) => {
      acc[ch] = { ...makeEmptyChannelPost(ch), body: getFunFallbackBody(ch) }
      return acc
    },
    {} as Record<ChannelName, import('./types').ChannelPost>
  )
  return {
    id: generatePostId(date),
    date,
    kind: 'fun_fallback',
    title,
    slug: generateSlug(title),
    tags: ['виб', 'пауза'],
    tone: 'ironic',
    canonicalContent: channels.site.body,
    channels,
    createdAt: now,
    updatedAt: now,
  }
}

/** Создаёт пустой regular-пост для ручного заполнения */
export function createEmptyRegularPost(date: string): BlogPost {
  const now = new Date().toISOString()
  const channels = (['site', 'telegram', 'max', 'vk'] as ChannelName[]).reduce(
    (acc, ch) => {
      acc[ch] = makeEmptyChannelPost(ch)
      return acc
    },
    {} as Record<ChannelName, import('./types').ChannelPost>
  )
  return {
    id: generatePostId(date),
    date,
    kind: 'regular',
    title: '',
    slug: '',
    tags: [],
    canonicalContent: '',
    channels,
    createdAt: now,
    updatedAt: now,
  }
}
