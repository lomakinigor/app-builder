/**
 * Canonical spec fixtures shared across T-106 / T-108 / T-110.
 *
 * Each export is a factory function that accepts optional overrides and returns
 * a fresh SpecPack so tests cannot mutate a shared constant.
 *
 * Feature names here are the canonical vocabulary used in assertions:
 *   - Application: "Онбординг пользователя", "Управление данными", "Дашборд / обзор"
 *   - Website:     "Главная страница", "Контентные страницы", "Блог / статьи"
 */

import type { SpecPack } from '../../shared/types'

/**
 * Canonical application spec.
 * featureList matches the service output pinned in T-102.
 */
export function createAppSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'application',
    productSummary: 'Приложение: сфокусированный менеджер задач',
    MVPScope: 'Однопользовательский CRUD с локальной персистентностью. Без аутентификации в V1.',
    featureList: [
      { id: 'f-001', name: 'Онбординг пользователя', description: 'Форма регистрации / входа', priority: 'must' },
      { id: 'f-002', name: 'Управление данными', description: 'Создание, просмотр, редактирование, удаление', priority: 'must' },
      { id: 'f-003', name: 'Дашборд / обзор', description: 'Сводный вид', priority: 'must' },
    ],
    assumptions: ['Основная платформа — десктопный браузер'],
    constraints: ['Нет бэкенда в V1'],
    acceptanceNotes: 'Пользователь может создавать задачи после перезагрузки.',
    ...overrides,
  }
}

/**
 * Canonical website spec.
 * featureList matches the service output pinned in T-102.
 */
export function createWebSpec(overrides: Partial<SpecPack> = {}): SpecPack {
  return {
    projectType: 'website',
    productSummary: 'Контентный сайт: сфокусированная блог-платформа',
    MVPScope: 'Главная страница, страница "О нас", блог на Markdown и контактная форма. Без CMS в V1.',
    featureList: [
      { id: 'f-001', name: 'Главная страница', description: 'Герой-секция с ценностным предложением, CTA', priority: 'must' },
      { id: 'f-002', name: 'Контентные страницы', description: 'Страницы "О нас", услуги', priority: 'must' },
      { id: 'f-003', name: 'Блог / статьи', description: 'Список статей на Markdown', priority: 'must' },
    ],
    assumptions: ['Контент создаётся в MDX'],
    constraints: ['Без аутентификации', 'Без базы данных в MVP'],
    acceptanceNotes: 'Посетитель может перейти с главной страницы на блог.',
    ...overrides,
  }
}
