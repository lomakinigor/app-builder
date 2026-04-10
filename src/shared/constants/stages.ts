import type { ProjectStage } from '../types'

export interface StageConfig {
  id: ProjectStage
  label: string
  shortLabel: string
  description: string
  path: string
  icon: string
}

export const STAGES: StageConfig[] = [
  {
    id: 'idea',
    label: 'Идея',
    shortLabel: 'Идея',
    description: 'Опишите идею продукта',
    path: '/idea',
    icon: '💡',
  },
  {
    id: 'research',
    label: 'Исследование',
    shortLabel: 'Иссл.',
    description: 'Запустите или импортируйте исследование',
    path: '/research',
    icon: '🔍',
  },
  {
    id: 'specification',
    label: 'Спецификация',
    shortLabel: 'Спец',
    description: 'Сгенерируйте структурированную спецификацию',
    path: '/spec',
    icon: '📋',
  },
  {
    id: 'architecture',
    label: 'Архитектура',
    shortLabel: 'Арх.',
    description: 'Определите стек, модули и дорожную карту',
    path: '/architecture',
    icon: '🏗️',
  },
  {
    id: 'first_prompt',
    label: 'Первый промпт',
    shortLabel: 'Промпт',
    description: 'Сгенерируйте первый промпт для Claude Code',
    path: '/prompt-loop',
    icon: '⚡',
  },
  {
    id: 'iterative_loop',
    label: 'Цикл сборки',
    shortLabel: 'Цикл',
    description: 'Итерируйте с ответами Claude Code',
    path: '/prompt-loop',
    icon: '🔄',
  },
]

export const STAGE_ORDER: ProjectStage[] = [
  'idea',
  'research',
  'specification',
  'architecture',
  'first_prompt',
  'iterative_loop',
  'done',
]

export function getStageIndex(stage: ProjectStage): number {
  return STAGE_ORDER.indexOf(stage)
}

export function isStageComplete(currentStage: ProjectStage, targetStage: ProjectStage): boolean {
  return getStageIndex(currentStage) > getStageIndex(targetStage)
}

export function isStageActive(currentStage: ProjectStage, targetStage: ProjectStage): boolean {
  return currentStage === targetStage
}
