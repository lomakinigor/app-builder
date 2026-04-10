import type { IdeaDraft, ResearchBrief, SpecPack, ArchitectureDraft, ProjectType } from '../types'
import { IDEA_MIN_LENGTH } from '../../features/idea-input/validation'

// ─── Stage gate result ────────────────────────────────────────────────────────

export interface StageGateResult {
  canAdvance: boolean
  /** Human-readable reason shown on the blocked button tooltip / banner */
  reason: string | null
}

// ─── Idea → Research ──────────────────────────────────────────────────────────

export function canAdvanceFromIdea(
  ideaDraft: IdeaDraft | null,
  projectType: ProjectType | null,
): StageGateResult {
  if (!ideaDraft) {
    return { canAdvance: false, reason: 'Идея ещё не сохранена. Сначала заполните поле идеи продукта.' }
  }

  const rawIdea = ideaDraft.rawIdea.trim()

  if (!rawIdea) {
    return { canAdvance: false, reason: 'Идея продукта пуста. Опишите, что вы хотите создать.' }
  }

  if (rawIdea.length < IDEA_MIN_LENGTH) {
    return {
      canAdvance: false,
      reason: `Идея слишком короткая (${rawIdea.length}/${IDEA_MIN_LENGTH} символов). Добавьте больше деталей перед продолжением.`,
    }
  }

  if (!projectType) {
    return { canAdvance: false, reason: 'Выберите, что вы создаёте — приложение или сайт.' }
  }

  return { canAdvance: true, reason: null }
}

// ─── Research → Spec ──────────────────────────────────────────────────────────

export function canAdvanceFromResearch(researchBrief: ResearchBrief | null): StageGateResult {
  if (!researchBrief) {
    return {
      canAdvance: false,
      reason: 'Бриф исследования ещё не готов. Запустите исследование или импортируйте готовое.',
    }
  }

  if (!researchBrief.problemSummary?.trim()) {
    return {
      canAdvance: false,
      reason: 'Бриф исследования неполный — отсутствует описание проблемы. Отредактируйте бриф перед продолжением.',
    }
  }

  return { canAdvance: true, reason: null }
}

// ─── Spec → Architecture ──────────────────────────────────────────────────────

export function canAdvanceFromSpec(specPack: SpecPack | null): StageGateResult {
  if (!specPack) {
    return {
      canAdvance: false,
      reason: 'Спецификации ещё нет. Сгенерируйте или отредактируйте спек перед продолжением.',
    }
  }

  if (!specPack.productSummary?.trim() && !specPack.MVPScope?.trim()) {
    return {
      canAdvance: false,
      reason: 'Спецификация неполная — резюме продукта и объём MVP оба пусты. Отредактируйте спек перед продолжением.',
    }
  }

  if (!specPack.projectType) {
    return {
      canAdvance: false,
      reason: 'В спецификации отсутствует тип проекта. Пересгенерируйте спецификацию.',
    }
  }

  return { canAdvance: true, reason: null }
}

// ─── Architecture → Prompt Loop ───────────────────────────────────────────────

export function canAdvanceFromArchitecture(architectureDraft: ArchitectureDraft | null): StageGateResult {
  if (!architectureDraft) {
    return {
      canAdvance: false,
      reason: 'Черновика архитектуры ещё нет. Сгенерируйте или отредактируйте архитектуру перед продолжением.',
    }
  }

  if (!architectureDraft.recommendedStack?.length) {
    return {
      canAdvance: false,
      reason: 'Архитектура неполная — не определены элементы стека. Отредактируйте архитектуру перед продолжением.',
    }
  }

  if (!architectureDraft.roadmapPhases?.length) {
    return {
      canAdvance: false,
      reason: 'Архитектура неполная — не определены фазы роадмапа. Отредактируйте архитектуру перед продолжением.',
    }
  }

  if (!architectureDraft.projectType) {
    return {
      canAdvance: false,
      reason: 'В архитектуре отсутствует тип проекта. Пересгенерируйте архитектуру.',
    }
  }

  return { canAdvance: true, reason: null }
}
