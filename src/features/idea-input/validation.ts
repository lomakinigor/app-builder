import type { IdeaDraft } from '../../shared/types'

// ─── Validation rules ─────────────────────────────────────────────────────────

export const IDEA_MIN_LENGTH = 50
export const IDEA_RECOMMENDED_LENGTH = 100

export interface IdeaValidationErrors {
  rawIdea?: string
  title?: string
}

export interface IdeaValidationResult {
  valid: boolean
  errors: IdeaValidationErrors
  warnings: string[]
}

// ─── Validate a full idea draft ───────────────────────────────────────────────

export function validateIdeaDraft(draft: Partial<IdeaDraft>): IdeaValidationResult {
  const errors: IdeaValidationErrors = {}
  const warnings: string[] = []

  const rawIdea = draft.rawIdea?.trim() ?? ''

  if (!rawIdea) {
    errors.rawIdea = 'Пожалуйста, опишите идею продукта, чтобы продолжить.'
  } else if (rawIdea.length < IDEA_MIN_LENGTH) {
    errors.rawIdea = `Продолжайте — опишите идею минимум в ${IDEA_MIN_LENGTH} символах (${rawIdea.length}/${IDEA_MIN_LENGTH}).`
  }

  if (rawIdea.length > 0 && rawIdea.length < IDEA_RECOMMENDED_LENGTH) {
    warnings.push(
      'Более подробное описание идеи улучшает качество исследования и спецификации. Стремитесь хотя бы к нескольким предложениям.'
    )
  }

  if (!draft.targetUser?.trim()) {
    warnings.push('Указание целевой аудитории помогает получить более релевантные результаты исследования.')
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  }
}

// ─── Single-field helpers ─────────────────────────────────────────────────────

export function getRawIdeaCharState(length: number): 'empty' | 'too_short' | 'ok' | 'good' {
  if (length === 0) return 'empty'
  if (length < IDEA_MIN_LENGTH) return 'too_short'
  if (length < IDEA_RECOMMENDED_LENGTH) return 'ok'
  return 'good'
}
