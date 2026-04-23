/**
 * Canonical architecture fixtures shared across T-104 / T-108 / T-110.
 *
 * Each export is a factory function that returns a fresh ArchitectureDraft
 * object so tests cannot accidentally mutate a shared constant.
 *
 * The canonical stacks, roadmap phases and vocabularies here are the
 * single source of truth for:
 *   - Application: React + TypeScript + Vite + Zustand + React Router + Tailwind CSS
 *   - Website:     Next.js + TypeScript + Tailwind CSS + MDX + Vercel
 */

import type { ArchitectureDraft } from '../../shared/types'

// ─── Application ──────────────────────────────────────────────────────────────

/**
 * Full 5-phase application architecture (foundation → polish).
 * Stack: React, TypeScript, Vite, Zustand, React Router, Tailwind CSS.
 */
export function createAppArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'application',
    moduleArchitecture: 'Фиче-слайс дизайн',
    dataFlow: 'Zustand стор → React компоненты → localStorage',
    technicalRisks: ['Нет бэкенда — только localStorage в V1'],
    recommendedStack: [
      { name: 'React', role: 'UI-слой', rationale: 'Компонентный SPA' },
      { name: 'TypeScript', role: 'Типобезопасность', rationale: 'Предотвращает ошибки в рантайме' },
      { name: 'Vite', role: 'Инструмент сборки', rationale: 'Быстрый HMR, лёгкий бандл' },
      { name: 'Zustand', role: 'Управление состоянием', rationale: 'Лёгкий стор' },
      { name: 'React Router', role: 'Клиентская маршрутизация', rationale: 'Декларативная SPA-маршрутизация' },
      { name: 'Tailwind CSS', role: 'Стилизация', rationale: 'Утилитарная дизайн-система' },
    ],
    roadmapPhases: [
      { phase: 0, title: 'Фундамент', goals: ['Оболочка приложения', 'Маршрутизация', 'Лейаут и навигация'], estimatedComplexity: 'low' },
      { phase: 1, title: 'Основной поток', goals: ['Экран онбординга', 'Список основных сущностей', 'Форма создания/редактирования'], estimatedComplexity: 'medium' },
      { phase: 2, title: 'Дашборд и навигация', goals: ['Сводный дашборд', 'Внутриприложная навигация'], estimatedComplexity: 'medium' },
      { phase: 3, title: 'Поиск, фильтры и настройки', goals: ['Фильтрация сущностей', 'Строка поиска'], estimatedComplexity: 'medium' },
      { phase: 4, title: 'Полировка и экспорт', goals: ['Экспорт в CSV/JSON', 'Аудит производительности'], estimatedComplexity: 'high' },
    ],
    ...overrides,
  }
}

/**
 * Application arch scoped to a single phase: phase 1 "Основной поток".
 * Used in prompt-generation tests that need a specific current phase.
 */
export function createAppArchCoreFlow(): ArchitectureDraft {
  return createAppArch({
    roadmapPhases: [
      { phase: 1, title: 'Основной поток', goals: ['Экран онбординга', 'Список основных сущностей', 'Форма создания/редактирования'], estimatedComplexity: 'medium' },
    ],
  })
}

// ─── Website ──────────────────────────────────────────────────────────────────

/**
 * Full 5-phase website architecture (foundation → polish & CMS).
 * Stack: Next.js, TypeScript, Tailwind CSS, MDX, Vercel.
 */
export function createWebArch(overrides: Partial<ArchitectureDraft> = {}): ArchitectureDraft {
  return {
    projectType: 'website',
    moduleArchitecture: 'Страницы + общие компоненты',
    dataFlow: 'Статические пропсы → страницы Next.js → MDX-контент',
    technicalRisks: ['SEO зависит от корректных мета-тегов'],
    recommendedStack: [
      { name: 'Next.js', role: 'Фреймворк', rationale: 'SSR/SSG для SEO' },
      { name: 'TypeScript', role: 'Типобезопасность', rationale: 'Предотвращает ошибки в рантайме' },
      { name: 'Tailwind CSS', role: 'Стилизация', rationale: 'Утилитарная дизайн-система' },
      { name: 'MDX', role: 'Создание контента', rationale: 'Markdown + JSX для постов блога' },
      { name: 'Vercel', role: 'Хостинг / деплой', rationale: 'Деплой без настройки' },
    ],
    roadmapPhases: [
      { phase: 0, title: 'Фундамент', goals: ['Скаффолд Next.js', 'Настройка Tailwind', 'Тёмная тема'], estimatedComplexity: 'low' },
      { phase: 1, title: 'Основные страницы', goals: ['Главная страница', 'Страница "О нас"', 'MDX-пайплайн'], estimatedComplexity: 'low' },
      { phase: 2, title: 'Блог', goals: ['Страница списка статей', 'Страница статьи', 'RSS-лента'], estimatedComplexity: 'medium' },
      { phase: 3, title: 'SEO и контакты', goals: ['Мета-теги для страниц', 'Sitemap.xml', 'Контактная форма'], estimatedComplexity: 'medium' },
      { phase: 4, title: 'Полировка и CMS', goals: ['Интеграция аналитики', 'Аудит производительности'], estimatedComplexity: 'high' },
    ],
    ...overrides,
  }
}

/**
 * Website arch scoped to a single phase: phase 1 "Основные страницы".
 * Used in prompt-generation tests that need a specific current phase.
 */
export function createWebArchCorePages(): ArchitectureDraft {
  return createWebArch({
    roadmapPhases: [
      { phase: 1, title: 'Основные страницы', goals: ['Главная страница', 'Страница "О нас"', 'MDX-пайплайн'], estimatedComplexity: 'low' },
    ],
  })
}

/**
 * Website arch scoped to a single phase: phase 2 "Блог".
 * Used in prompt-generation tests that need a specific current phase.
 */
export function createWebArchBlog(): ArchitectureDraft {
  return createWebArch({
    roadmapPhases: [
      { phase: 2, title: 'Блог', goals: ['Страница списка статей', 'Страница статьи', 'RSS-лента'], estimatedComplexity: 'medium' },
    ],
  })
}
