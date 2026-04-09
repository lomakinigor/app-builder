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
    label: 'Idea',
    shortLabel: 'Idea',
    description: 'Capture your raw product idea',
    path: '/idea',
    icon: '💡',
  },
  {
    id: 'research',
    label: 'Research',
    shortLabel: 'Research',
    description: 'Run or import research, build a brief',
    path: '/research',
    icon: '🔍',
  },
  {
    id: 'specification',
    label: 'Specification',
    shortLabel: 'Spec',
    description: 'Generate structured spec and feature list',
    path: '/spec',
    icon: '📋',
  },
  {
    id: 'architecture',
    label: 'Architecture',
    shortLabel: 'Arch',
    description: 'Define stack, modules, and roadmap',
    path: '/architecture',
    icon: '🏗️',
  },
  {
    id: 'first_prompt',
    label: 'First Prompt',
    shortLabel: 'Prompt',
    description: 'Generate your first Claude Code prompt',
    path: '/prompt-loop',
    icon: '⚡',
  },
  {
    id: 'iterative_loop',
    label: 'Build Loop',
    shortLabel: 'Loop',
    description: 'Iterate with Claude Code responses',
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
