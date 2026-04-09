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
    errors.rawIdea = 'Please describe your product idea to continue.'
  } else if (rawIdea.length < IDEA_MIN_LENGTH) {
    errors.rawIdea = `Keep going — describe your idea in at least ${IDEA_MIN_LENGTH} characters (${rawIdea.length}/${IDEA_MIN_LENGTH}).`
  }

  if (rawIdea.length > 0 && rawIdea.length < IDEA_RECOMMENDED_LENGTH) {
    warnings.push(
      'A longer idea description leads to better research and a more accurate spec. Aim for at least a few sentences.'
    )
  }

  if (!draft.targetUser?.trim()) {
    warnings.push('Adding a target user helps the research stage produce more relevant results.')
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
